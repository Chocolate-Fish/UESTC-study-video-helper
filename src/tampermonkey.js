// ==UserScript==
// @name         刷课助手
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  自动解除暂停限制 + 倍速播放 + 伪造心跳上报
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置区 ====================
    const CONFIG = {
        targetRate: 2.5,      // ← 改这里调整倍速：2.0=2倍速，3.0=3倍速
        heartbeatUrl: '/jjfz/lesson/current_time',  // 心跳接口特征
        debug: true           // 控制台日志开关
    };
    // =================================================

    const log = (...args) => CONFIG.debug && console.log('[刷课助手]', ...args);

    function init() {
        const video = document.getElementById('video');
        if (!video) return;

        log('检测到视频播放器，开始注入...');

        // ========== 1. 解除前端限制 ==========

        // 解除5分钟强制暂停
        window.loop_pause = function() {
            log('阻止了 loop_pause 自动暂停');
        };

        const _setTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay, ...args) {
            if (typeof fn === 'string' && fn.includes('loop_pause')) {
                log('拦截了 loop_pause 定时器');
                return Math.random();
            }
            return _setTimeout.call(this, fn, delay, ...args);
        };

        // 解除切标签页/最小化自动暂停
        Object.defineProperty(document, 'visibilityState', {
            get() { return 'visible'; },
            configurable: true
        });
        Object.defineProperty(document, 'hidden', {
            get() { return false; },
            configurable: true
        });

        // 阻止平台注册新的 visibilitychange 监听
        const _addEventListener = document.addEventListener;
        document.addEventListener = function(type, listener, options) {
            if (type === 'visibilitychange') {
                log('阻止了新的 visibilitychange 监听');
                return;
            }
            return _addEventListener.call(this, type, listener, options);
        };

        // 清理右键和F12限制（等DOM加载完）
        setTimeout(() => {
            document.oncontextmenu = null;
            document.onkeydown = null;
            document.onkeyup = null;
            document.onkeypress = null;
            log('已清理右键和F12限制');
        }, 1000);

        // ========== 2. 倍速核心：让平台"瞎眼" ==========

        // 拿到原生底层 setter
        const originalSet = Object.getOwnPropertyDescriptor(
            HTMLMediaElement.prototype, 'playbackRate'
        ).set.bind(video);

        // 劫持 playbackRate：读取永远返回1，但底层真实倍速由我们控制
        Object.defineProperty(video, 'playbackRate', {
            configurable: true,
            enumerable: true,
            get: function() {
                return 1;  // 骗过平台检测 "!= 1"
            },
            set: function(v) {
                originalSet(v);
            }
        });

        // 每50ms维持真实倍速
        setInterval(() => {
            originalSet(CONFIG.targetRate);
        }, 50);

        // ========== 3. 伪造心跳时间 ==========

        let fakeBaseTime = video.currentTime;
        let lastTick = Date.now();
        let isPlaying = !video.paused;

        video.addEventListener('play', () => {
            isPlaying = true;
            lastTick = Date.now();
            fakeBaseTime = video.currentTime;
        });

        video.addEventListener('pause', () => {
            if (isPlaying) {
                fakeBaseTime += (Date.now() - lastTick) / 1000;
            }
            isPlaying = false;
        });

        video.addEventListener('seeked', () => {
            lastTick = Date.now();
            fakeBaseTime = video.currentTime;
            log('拖动进度条，重置伪造基准');
        });

        // 劫持 XMLHttpRequest（底层双保险）
        const _open = XMLHttpRequest.prototype.open;
        const _send = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(method, url) {
            this._url = url;
            return _open.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(body) {
            if (this._url && this._url.includes(CONFIG.heartbeatUrl)) {
                let currentFake = fakeBaseTime;
                if (isPlaying) {
                    currentFake += (Date.now() - lastTick) / 1000;
                }

                if (typeof body === 'string') {
                    body = body.replace(/time=[^&]*/, `time=${currentFake}`);
                } else if (body instanceof FormData) {
                    const newBody = new FormData();
                    for (let [key, value] of body.entries()) {
                        newBody.append(key, key === 'time' ? currentFake : value);
                    }
                    body = newBody;
                }

                fakeBaseTime = currentFake;
                lastTick = Date.now();
                log('伪造心跳上报时间:', currentFake.toFixed(2), '秒');
            }
            return _send.call(this, body);
        };

        // 劫持 jQuery.ajax（兼容层）
        function hijackJQuery() {
            if (!window.$ || !$.ajax) return;

            const _ajax = $.ajax;
            $.ajax = function(options) {
                if (options.url && options.url.includes(CONFIG.heartbeatUrl)) {
                    let currentFake = fakeBaseTime;
                    if (isPlaying) {
                        currentFake += (Date.now() - lastTick) / 1000;
                    }

                    if (typeof options.data === 'object' && !(options.data instanceof FormData)) {
                        options.data = Object.assign({}, options.data, { time: currentFake });
                    } else if (typeof options.data === 'string') {
                        options.data = options.data.replace(/time=[^&]*/, `time=${currentFake}`);
                    }

                    fakeBaseTime = currentFake;
                    lastTick = Date.now();
                    log('jQuery 伪造心跳:', currentFake.toFixed(2), '秒');
                }
                return _ajax.call($, options);
            };

            log('jQuery.ajax 劫持成功');
        }

        // 立即尝试 + 定时检查 jQuery 是否后加载
        hijackJQuery();
        const jqCheck = setInterval(() => {
            if (window.$ && $.ajax) {
                hijackJQuery();
                clearInterval(jqCheck);
            }
        }, 1000);
        setTimeout(() => clearInterval(jqCheck), 30000);

        log(`✅ 已启动 ${CONFIG.targetRate} 倍速伪装模式`);
        log('   本地实际播放速度:', CONFIG.targetRate + 'x');
        log('   上报服务器速度: 1.0x（伪造）');
    }

    // 等待 video 元素出现
    if (document.getElementById('video')) {
        init();
    } else {
        const observer = new MutationObserver(() => {
            if (document.getElementById('video')) {
                observer.disconnect();
                init();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
})();
