require(['gitbook', 'jquery'], function(gitbook, $) {
    $.fn.extend({
        navMapScroll (active) {
            // 缓存jquey 查询的元素， 或类名
            var pageEqClass = {};
            var navEqClass = {};
            var pageList = [];
            var navElems = $(this).find('a');
            var headerHeight = $('.header-inner').outerHeight();
            //节流函数
            var thrFn  = function (fn, time, maxLog) {
                var timeK = null;
                var oTime = new Date().getTime();
                var execFn = function () {
                    fn();
                    oTime = new Date().getTime();
                }
                return function () {
                    var nTime = new Date().getTime();
                    clearTimeout(timeK);
                    if (nTime - oTime > maxLog) {
                        execFn();
                    } else {
                        timeK = setTimeout(execFn, time);
                    }
                }
            }
            var currentSelect = null;
            var fn = thrFn(function () {
                for (var k in pageEqClass) {
                    var elem = pageEqClass[k];
                    var offsetTop = elem.offset().top - headerHeight;
                    if (offsetTop > 0) {
                        // 防止标题与内容过长的情况
                        if(offsetTop > 500) {
                            return;
                        }
                        currentSelect && currentSelect.removeClass('selected');
                        currentSelect = navEqClass[k].addClass(active);
                        return;
                    }
                }
            }, 50, 200)
            // 筛查元素
            navElems.each(function () {
                const $elem = $(this);
                const className = $elem.attr("data-id");
                const elem = $('#' + className);
                if(elem.length === 1) {
                    pageList.push(elem);
                    pageEqClass[className] = elem;
                    navEqClass[className] = $elem;
                }
            });
            document.onmousewheel = function() {
                fn();
            }
            navElems.on('click', function () {
                // 点击菜单 滚动到对应的内容区。
                var className = $(this).attr("data-id");
                $(window).scrollTop(pageEqClass[className].offset().top);
                $(".book-anchor-body>a").removeClass("selected");
                $(this).addClass("selected");
            })
            fn()
            return this
        }
    });

    function getRootPath() {
        var pathName = window.location.pathname.substring(1);
        var webName = pathName == '' ? '' : pathName.substring(0, pathName.indexOf('/'));
        if (webName == "") {
            return window.location.protocol + '//' + window.location.host;
        }
        else {
            return window.location.protocol + '//' + window.location.host + '/' + webName;
        }
    }

    //生成内容导航
    function generateSectionNavigator(){
        $(".page-inner .markdown-section").find("h1,h2,h3").each(function(){
            var cls = "anchor-h1";
            if($(this).is("h2")){
                cls = "anchor-h2";
            } else if($(this).is("h3")){
                cls = "anchor-h3";
            }
            var text = $(this).text();
            var href = $(this).attr("id");
            $(".book-anchor-body").append(`<a id="an_${text}" class="anchor-text ${cls}" title="${text}"  href="#${href}" data-id="${text}">${text}</a>`)
        });

        //获取hash值定向到指定位置
        var hash = decodeURIComponent(location.hash);
        if(hash){
            hash = hash.substring(1);
            $("#an_"+hash).addClass("selected");
        }
        
    }

    //基础设置
    function setBase(){
        //标题
        var $title = $(".header-inner .title");
        $title.text(gitbook.state.config.title);
          
        //搜索框
        var $search = $('#book-search-input');
        var placeholder = gitbook.state.config.pluginsConfig.integration["search-placeholder"] || "输入关键字搜索"
        $search.find("input").attr("placeholder",placeholder);
        $search.append("<span id='searchBtn'>搜索</span>");
        $search.focus();
        $("#searchBtn").click(function(e){});

        //去掉gitbook-link
        $(".summary .gitbook-link").hide();
        $(".summary .divider").hide();
    }

    gitbook.events.on('start', function() {
    });

    gitbook.events.on('page.change', function() {
        setBase();
        generateSectionNavigator();
        $(function() {
            $('.book-anchor-body').navMapScroll('selected');
        });
    });
});
