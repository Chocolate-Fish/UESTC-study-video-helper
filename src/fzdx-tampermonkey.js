(function() {
    const video = document.getElementById('video');
    if (!video) {
        alert('页面还没加载完视频，等几秒再试');
        return;
    }

    // 1. 解除前端限制
    window.loop_pause = function(){};
    clearTimeout(window.loop_flag);
    
    const _st = window.setTimeout;
    window.setTimeout = function(a, b) {
        if (typeof a === 'string' && a.indexOf('loop_pause') !== -1) return 1;
        return _st(a, b);
    };
    
    Object.defineProperty(document, 'visibilityState', {
        get() { return 'visible'; },
        configurable: true
    });
    Object.defineProperty(document, 'hidden', {
        get() { return false; },
        configurable: true
    });
    
    document.oncontextmenu = null;
    document.onkeydown = null;

    // 2. 倍速核心：劫持 playbackRate
    const TARGET_RATE = 2.5;  // ← 改这里调整倍速
    
    const originalSet = Object.getOwnPropertyDescriptor(
        HTMLMediaElement.prototype, 'playbackRate'
    ).set.bind(video);
    
    Object.defineProperty(video, 'playbackRate', {
        configurable: true,
        enumerable: true,
        get: function() { 
            return 1;
        },
        set: function(v) { 
            originalSet(v);
        }
    });
    
    setInterval(() => {
        originalSet(TARGET_RATE);
    }, 50);

    // 3. 伪造心跳
    let fakeBaseTime = video.currentTime;
    let lastTick = Date.now();
    let isPlaying = !video.paused;
    
    video.addEventListener('play', () => {
        isPlaying = true;
        lastTick = Date.now();
        fakeBaseTime = video.currentTime;
    });
    
    video.addEventListener('pause', () => {
        if (isPlaying) fakeBaseTime += (Date.now() - lastTick) / 1000;
        isPlaying = false;
    });
    
    video.addEventListener('seeked', () => {
        lastTick = Date.now();
        fakeBaseTime = video.currentTime;
    });
    
    if (window.$ && $.ajax) {
        const _ajax = $.ajax;
        $.ajax = function(options) {
            if (options.url && options.url.includes('/fzdx/lesson/current_time')) {
                let currentFake = fakeBaseTime;
                if (isPlaying) currentFake += (Date.now() - lastTick) / 1000;
                
                if (typeof options.data === 'object') {
                    options.data = Object.assign({}, options.data, { time: currentFake });
                } else if (typeof options.data === 'string') {
                    options.data = options.data.replace(/time=[^&]*/, `time=${currentFake}`);
                }
                
                fakeBaseTime = currentFake;
                lastTick = Date.now();
            }
            return _ajax.call($, options);
        };
    }
    
    console.log(`✅ 已开启 ${TARGET_RATE} 倍速伪装（平台读取永远显示 1x）`);
})();
