require(['gitbook', 'jQuery'], function(gitbook, $) {
    gitbook.events.bind('page.change', function() {
        $('img').each(function() {
            var $dom = $(this);
            $dom.wrap('<span class="fancybox" href="' + $dom.attr('src') + '"></span>');
        });
        window.$('.fancybox').fancybox();
      });
});