var fs = require('fs');
var path = require('path');
var Entities = require('html-entities').AllHtmlEntities;
var crypto = require('crypto');
const pluginName = require('./package.json').name
var Html = new Entities();
var documentsStore = {};
var pageBeforeHooks = [];
const childProcess = require('child_process');
var umlPath,output;
module.exports = {
    website: {
        assets: './assets/',
        js: [
            'theme/fexa.js',
            'expandable/expandable-chapters.js',
            'code/code.js',
            'back-to-top/back-to-top-button.js',
            'search/search.js',
            'mermaid/plugin.js',
            'fancybox/plugin.js',
            'fancybox/jquery-1.10.1.min.js',
            'fancybox/jquery.fancybox-1.3.4.js',
            'fancybox/jquery.mark.min.js',
        ],
        css: [
            'theme/fexa.css',
            'expandable/expandable-chapters.css',
            'code/code.css',
            'back-to-top/back-to-top-button.css',
            'search/search.css',
            'mermaid/mermaid.css',
            'fancybox/jquery.fancybox-1.3.4.css'
        ]
    },
    hooks: {
        init() { 
            var variables = this.config.get('variables') || {};
            var integrationCfg = this.config.get('pluginsConfig').integration;
            output = (integrationCfg ? (integrationCfg.output || '_book') : '_book') + '/gitbook';
            variables.copyright = integrationCfg.copyright || `Copyright & Copy @${new Date().getFullYear()} ${this.config.get('author')}. All rights reserved.`;
            variables.modification =  `${integrationCfg.modify_label || '该文章修订时间：'} ${fmtDate(new Date(), integrationCfg.modify_format || 'yyyy-MM-dd hh:mm:ss')}`;
            variables.integration = integrationCfg;
            this.config.set('variables', variables);
            umlPath = path.join(process.cwd(), output, 'images', 'uml');
            fs.mkdir(umlPath, { recursive: true }, function(error) {});
        },
        config: function(config) {
          return config;
        },
        'page:before': function(page) {
            var that = this;
            pageBeforeHooks.forEach(function(fun) {
               page = fun.call(that, page);
            });
            return page;
        },
        page: function(page) {
            if (this.output.name != 'website' || page.search === false) {
                return page;
            }
            var text;
            text = page.content;
            // Decode HTML
            text = Html.decode(text);
            // Strip HTML tags
            text = text.replace(/(<([^>]+)>)/ig, '');
            text = text.replace(/[\n ]+/g, ' ');
            var keywords = [];
            if (page.search) {
                keywords = page.search.keywords || [];
            }

            // Add to index
            var doc = {
                url: this.output.toURL(page.path),
                title: page.title,
                summary: page.description,
                keywords: keywords.join(' '),
                body: text
            };

            documentsStore[doc.url] = doc;
            return page;
        },
        finish: function () {
            var configOption = this.config.get('pluginsConfig')['integration'];
            var pathFile;
            // favicon
            pathFile = configOption && configOption.favicon;
            if (pathFile) {
                var faviconPath = path.join(process.cwd(), pathFile);
                var gitbookFaviconPath = path.join(process.cwd(), output, 'images', 'favicon.ico');
                if (fs.existsSync(faviconPath)) {
                    fs.writeFileSync(gitbookFaviconPath, fs.readFileSync(faviconPath));
                }
            }

            // appleTouchIconPrecomposed152
            pathFile = configOption && configOption.appleTouchIconPrecomposed152;
            if (pathFile) {
                var appleTouchIconPrecomposed152 = path.join(process.cwd(), pathFile);
                var gitbookAppleTouchPath = path.join(process.cwd(), output, 'images', 'apple-touch-icon-precomposed-152.png');
                if (fs.existsSync(appleTouchIconPrecomposed152)) {
                    fs.writeFileSync(gitbookAppleTouchPath, fs.readFileSync(appleTouchIconPrecomposed152));
                }
            }

            //logo
            pathFile = configOption && configOption.logo;
            if(pathFile){
                var logoPath = path.join(process.cwd(), pathFile);
                var pluginLogoPath = path.join(process.cwd(), output, pluginName,"logo.png");
                if (fs.existsSync(logoPath)) {
                    fs.writeFileSync(pluginLogoPath, fs.readFileSync(logoPath));
                }
            }

            // write search index
            if (this.output.name != 'website') return;
            return this.output.writeFile('search_plus_index.json', JSON.stringify(documentsStore));
        }
    }
};

var fmtDate = function (value,fmt) {
    if(!value || !fmt){
        return "";
    }
    try{
        var d = value instanceof Date ? value : (!isNaN(value) ? new Date(value) : (/([a-zA-Z])/.test(value) ? value : new Date(value.replaceAll("-","/"))));
        var o = {
            "M+": d.getMonth() + 1, //月份
            "d+": d.getDate(), //日
            "h+": d.getHours(), //小时
            "m+": d.getMinutes(), //分
            "s+": d.getSeconds(), //秒
            "q+": Math.floor((d.getMonth() + 3) / 3), //季度
            "S": d.getMilliseconds() //毫秒
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (d.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }catch(e){
        return "";
    }
}
var mermaidRegex = /^```mermaid((.*[\r\n]+)+?)?```$/im;
var umlRegex = /^```uml((.*\n)+?)?```$/im;
pageBeforeHooks.push(function(page) {  
  var match;
  while ((match = mermaidRegex.exec(page.content))) {
    page.content = page.content.replace(match[0], `<div class="mermaid">${match[1]}</div>`);
  }
  return page;
}, function(page) {
    var content = page.content;
    var mode = this.output.name;
    while((match = umlRegex.exec(content))) {
        var rawBlock = match[0];
        var umlBlock = match[1];
        var md5 = crypto.createHash('md5').update(umlBlock).digest('hex');
        var umlFile = path.join(umlPath, md5+'.uml');
        fs.writeFileSync(umlFile, match[1], 'utf8');
        var commandLine = `java -jar ${output}/${pluginName}/plantuml/plantuml.jar -tpng ${umlFile} -o ${umlPath}`;
        try {
            childProcess.execSync(commandLine);
            var svgTag = ['![](', ('website' === mode ? '/gitbook/images/uml/' : ['http://localhost:4000/gitbook/images/uml/', '/'].join('')), md5, '.png)'].join('');
            page.content = content = content.replace(rawBlock, svgTag);
        } catch (error) {
           console.warn(`UML编译失败，cause by:${error}`);
           // fallback
           page.content = content = content.replace(rawBlock, rawBlock.replace('```uml', '```'));
        }
    }
    return page;
});