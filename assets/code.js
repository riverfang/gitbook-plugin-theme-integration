require(['gitbook', 'jQuery'], function(gitbook, $) {

  var pluginConfig = {};

  function addCopyButton(wrapper) {
    wrapper.append(
        $('<div class="copy-code-button" data-copy-word="复制"></div>')
            .click(function() {
              copyCommand($(this));
              $(this).attr('data-copy-word', '复制成功');
              setTimeout(() => {
                $(this).attr('data-copy-word', '复制');
              }, 2000);
            })
    );
  }

  function addCopyTextarea() {

    /* Add also the text area that will allow to copy */
    $('body').append('<textarea id="code-textarea"/>');
  }

  function copyCommand(button) {
    var pre = button.parent();
    var textarea = $('#code-textarea');
    textarea.val(pre.text());
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    pre.focus();
  }

  function initializePlugin(config) {
    pluginConfig = config.integration;
  }

  function format_code_block(block) {
    /*
     * Add line numbers for multiline blocks.
     */
    var code = block.children('code');
    var lines = code.html().split('\n');

    if (lines[lines.length - 1] == '') {
      lines.splice(-1, 1);
    }
    lines.length > 1 && code.html(lines.map((line, index) => {
      index += 1;
      var gutterColor = index % 2 !== 0 ? 'gutter-color' : '';
      return `<div class="${gutterColor}"><div class="line-number" data-line-number="${index}"></div><span class="code-line">${line}</span></div>`;
    }).join(''));
    
    // Add wrapper to pre element and Add copyButton
    addCopyButton(block.wrap('<div class="code-wrapper"></div>'));
  }

  gitbook.events.bind('start', function(e, config) {
    initializePlugin(config);

    if (pluginConfig.copyButtons !== false) {
      addCopyTextarea();
    }
  });

  gitbook.events.bind('page.change', function() {
    $('pre').each(function() {
      format_code_block($(this));
    }).on('mouseenter', function(){
      $(this).find('.copy-code-button').show();
    }).on('mouseleave', function(){
      $(this).find('.copy-code-button').hide();
    });
  });

});
