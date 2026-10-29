<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ in_array($userLanguage ?? 'en', ['ar', 'he']) ? 'rtl' : 'ltr' }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <script src="{{ asset('js/jquery.min.js') }}"></script>
        @routes
        @if (app()->environment('local'))
            @viteReactRefresh
        @endif
        @vite(['resources/js/app.tsx'])
        <script>
            // Ensure base URL is correctly set for assets
            window.baseUrl = '{{ url('/') }}';
            window.APP_URL = '{{ config('app.url') }}';
            window.appConfig = {
                is_demo: {{ config('app.is_demo') ? 'true' : 'false' }}
            };

            // Define asset helper function
            window.asset = function(path) {
                return "{{ asset('') }}" + path;
            };

            // Define storage helper function
            window.storage = function(path) {
                return "{{ asset('storage') }}/" + path;
            };

            // Set initial locale synchronously
            window.initialLocale = '{{ $userLanguage ?? "en" }}';

            // Apply RTL direction immediately based on current language
            const currentLang = '{{ $userLanguage ?? "en" }}';
            const isRtl = ['ar', 'he'].includes(currentLang);
            if (isRtl) {
                document.documentElement.dir = 'rtl';
                document.documentElement.setAttribute('dir', 'rtl');
            } else {
                document.documentElement.dir = 'ltr';
                document.documentElement.setAttribute('dir', 'ltr');
            }

            // Set user data for language detection
            @if(auth()->check())
            window.authUser = {
                lang: '{{ auth()->user()->lang ?? "en" }}',
                type: '{{ auth()->user()->type }}'
            };
            @endif
        </script>
        @inertiaHead
<!-- Google Analytics -->

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-7ZH5JRBPWC"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-7ZH5JRBPWC');
</script>

    </head>
    <body class="font-sans antialiased">
        <script>
            // console.log('Debug - userLanguage:', '{{ $userLanguage ?? "NOT_SET" }}');
            // console.log('Debug - auth user:', {{ auth()->check() ? 'true' : 'false' }});
            // console.log('Debug - app locale:', '{{ app()->getLocale() }}');
        </script>
        @inertia



<!--Start of Tawk.to Script-->
<script type="text/javascript">
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
    
      // Only load Tawk.to if the user is on the homepage
  if (window.location.pathname !== '/') {
    return;
  }
    
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/6a82aef0e687441d49b8edaf/1k077mn0o';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
</script>


<script>
(function () {
  var CSS_RULES = `
    /* "Powered by tawk.to" branding */
    a[style*="border-radius: 100px"][style*="font-size: 12px"],
    a[style*="font-size: 12px"][style*="font-weight: 400"][style*="padding"],

    /* "Add Chat to your website" menu item */
    a[href*="utm_source=tawk-messenger"],

    /* "Pop out widget" menu item */
    button:has(i.tawk-icon-popout),

    /* "Email transcript" menu item */
    button:has(i.tawk-icon-envelope) {
      display: none !important;
    }
  `;

  function injectStyle(doc) {
    try {
      if (!doc || doc.getElementById('hide-tawk-badge')) return;
      var style = doc.createElement('style');
      style.id = 'hide-tawk-badge';
      style.textContent = CSS_RULES;
      (doc.head || doc.documentElement).appendChild(style);
    } catch (e) {}
  }

  function textFallback(doc) {
    try {
      doc.querySelectorAll('a, button').forEach(function (el) {
        var t = (el.textContent || '').toLowerCase().trim();
        var hasLogoSvg = el.querySelector && el.querySelector('svg[viewBox="0 0 107 15"]');
        var isAddChat = t.includes('add chat to your website');
        var isPopout = t.includes('pop out widget');
        var isEmailTranscript = t.includes('email transcript');
        if (hasLogoSvg || isAddChat || isPopout || isEmailTranscript) {
          el.style.setProperty('display', 'none', 'important');
        }
      });
    } catch (e) {}
  }

  function process(doc) {
    injectStyle(doc);
    textFallback(doc);
  }

  process(document);

  function handleIframe(iframe) {
    var tryInject = function () {
      try {
        var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        process(doc);
      } catch (e) {}
    };
    tryInject();
    iframe.addEventListener('load', tryInject);
  }

  document.querySelectorAll('iframe').forEach(handleIframe);

  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeName === 'IFRAME') handleIframe(node);
        else if (node.querySelectorAll) node.querySelectorAll('iframe').forEach(handleIframe);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  var tick = setInterval(function () {
    process(document);
    document.querySelectorAll('iframe').forEach(function (f) {
      try {
        process(f.contentDocument || (f.contentWindow && f.contentWindow.document));
      } catch (e) {}
    });
  }, 100);
  setTimeout(function () { clearInterval(tick); }, 8000);
})();
</script>

<!-- End of Tawk.to Script -->

    </body>
</html>
