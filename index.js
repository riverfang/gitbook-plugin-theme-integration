var fs = require('fs');
var path = require('path');
var Entities = require('html-entities').AllHtmlEntities;

var Html = new Entities();
// Map of Lunr ref to document
var documentsStore = {};
module.exports = {
    website: {
        assets: './assets/',
        js: [
            'fexa.js',
            'expandable-chapters.js',
            'code.js',
            'back-to-top-button.js',
            'jquery.mark.min.js',
            'search.js',
            'mermaid/plugin.js',
            'fancybox/plugin.js',
            'fancybox/jquery-1.10.1.min.js',
            'fancybox/jquery.fancybox-1.3.4.js'
        ],
        css: [
            'fexa.css',
            'expandable-chapters.css',
            'code.css',
            'back-to-top-button.css',
            'search.css',
            'mermaid/mermaid.css',
            'fancybox/jquery.fancybox-1.3.4.css'
        ]
    },
    hooks: {
        init() { 
            var variables = this.config.get('variables') || {};
            var integrationCfg = this.config.get('pluginsConfig').integration;
            variables.copyright = integrationCfg.copyright || `Copyright & Copy @${new Date().getFullYear()} ${this.config.get('author')}. All rights reserved.`;
            variables.modification =  `${integrationCfg.modify_label || '该文章修订时间：'} ${fmtDate(new Date(), integrationCfg.modify_format || 'yyyy-MM-dd hh:mm:ss')}`;
            variables.integration = integrationCfg;
            this.config.set('variables', variables);
        },
        config: function(config) {
         
          return config;
        },
        'page:before': processMermaidBlockList,
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
            var output = configOption ? (configOption.output || '_book') : '_book';
            var pathFile;

            // favicon
            pathFile = configOption && configOption.favicon;
            if (pathFile) {
                var faviconPath = path.join(process.cwd(), pathFile);
                var gitbookFaviconPath = path.join(process.cwd(), output, 'gitbook', 'images', 'favicon.ico');
                if (fs.existsSync(faviconPath)) {
                    fs.writeFileSync(gitbookFaviconPath, fs.readFileSync(faviconPath));
                }
            }

            // appleTouchIconPrecomposed152
            pathFile = configOption && configOption.appleTouchIconPrecomposed152;
            if (pathFile) {
                var appleTouchIconPrecomposed152 = path.join(process.cwd(), pathFile);
                var gitbookAppleTouchPath = path.join(process.cwd(), output, 'gitbook', 'images', 'apple-touch-icon-precomposed-152.png');
                if (fs.existsSync(appleTouchIconPrecomposed152)) {
                    fs.writeFileSync(gitbookAppleTouchPath, fs.readFileSync(appleTouchIconPrecomposed152));
                }
            }

            //logo
            pathFile = configOption && configOption.logo;
            if(pathFile){
                var logoPath = path.join(process.cwd(), pathFile);
                var pluginLogoPath = path.join(process.cwd(), output, 'gitbook','gitbook-plugin-theme-integration',"logo.jpg");
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

function processBlock(body) {
    return convertToSvg(body)
        .then(function (svgCode) {
            return svgCode.replace(/mermaidChart1/g, getId());
        });
  }
  
  function convertToSvg(mermaidCode) {
    var deferred = Q.defer();
    phantom.create({binary: PHANTOMJS_BIN}, function (ph) {
      ph.createPage(function (page) {
  
        var htmlPagePath = path.join(__dirname, 'convert/converter.html');
  
        page.open(htmlPagePath, function (status) {
          page.evaluate(
            function (code) {
              return renderToSvg(code);
            },
            function (result) {
              ph.exit();
              deferred.resolve(result);
            },
            mermaidCode);
        });
      });
    });
  
    return deferred.promise;
  }
  
  function getId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return "mermaidChart-" + s4() + s4();
  }

  var mermaidRegex = /^```mermaid((.*[\r\n]+)+?)?```$/im;

function processMermaidBlockList(page) {

  var match;

  while ((match = mermaidRegex.exec(page.content))) {
    var rawBlock = match[0];
    var mermaidContent = match[1];
    page.content = page.content.replace(rawBlock, '<div class="mermaid">' +
      mermaidContent + '</div>');
  }

  return page;
}