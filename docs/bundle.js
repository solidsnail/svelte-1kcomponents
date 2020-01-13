
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    var MonitorMaxSamples = 100;
    var MonitorSamplesResult = (function () {
        function MonitorSamplesResult(min, max, mean, last) {
            this.min = min;
            this.max = max;
            this.mean = mean;
            this.last = last;
        }
        return MonitorSamplesResult;
    }());
    /**
     * Profile Samples.
     */
    var MonitorSamples = (function () {
        function MonitorSamples(maxSamples) {
            this.samples = [];
            this.maxSamples = maxSamples;
            this._i = -1;
        }
        MonitorSamples.prototype.addSample = function (v) {
            this._i = (this._i + 1) % this.maxSamples;
            this.samples[this._i] = v;
        };
        MonitorSamples.prototype.each = function (fn) {
            var samples = this.samples;
            for (var i = 0; i < samples.length; i++) {
                fn(samples[(this._i + 1 + i) % samples.length], i);
            }
        };
        MonitorSamples.prototype.calc = function () {
            var samples = this.samples;
            if (samples.length === 0) {
                return new MonitorSamplesResult(0, 0, 0, 0);
            }
            var min = samples[(this._i + 1) % samples.length];
            var max = min;
            var sum = 0;
            for (var i = 0; i < samples.length; i++) {
                var k = samples[(this._i + 1 + i) % samples.length];
                if (k < min) {
                    min = k;
                }
                if (k > max) {
                    max = k;
                }
                sum += k;
            }
            var last = samples[this._i];
            var mean = sum / samples.length;
            return new MonitorSamplesResult(min, max, mean, last);
        };
        return MonitorSamples;
    }());

    var frameTasks = [];
    var rafId = -1;
    /**
     * Schedule new task that will be executed on the next frame.
     */
    function scheduleNextFrameTask(task) {
        frameTasks.push(task);
        if (rafId === -1) {
            requestAnimationFrame(function (t) {
                rafId = -1;
                var tasks = frameTasks;
                frameTasks = [];
                for (var i = 0; i < tasks.length; i++) {
                    tasks[i]();
                }
            });
        }
    }

    var __extends =  (function () {
        var extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var MonitorGraphHeight = 30;
    var MonitorGraphWidth = MonitorMaxSamples;
    var Widget = (function () {
        function Widget(name) {
            var _this = this;
            this._sync = function () {
                _this.sync();
                _this._dirty = false;
            };
            this.name = name;
            this.element = document.createElement("div");
            this.element.style.cssText = "padding: 2px;" +
                "background-color: #020;" +
                "font-family: monospace;" +
                "font-size: 12px;" +
                "color: #0f0";
            this._dirty = false;
            this.invalidate();
        }
        Widget.prototype.invalidate = function () {
            if (!this._dirty) {
                this._dirty = true;
                scheduleNextFrameTask(this._sync);
            }
        };
        Widget.prototype.sync = function () {
            throw new Error("sync method not implemented");
        };
        return Widget;
    }());
    var MonitorWidgetFlags;
    (function (MonitorWidgetFlags) {
        MonitorWidgetFlags[MonitorWidgetFlags["HideMin"] = 1] = "HideMin";
        MonitorWidgetFlags[MonitorWidgetFlags["HideMax"] = 2] = "HideMax";
        MonitorWidgetFlags[MonitorWidgetFlags["HideMean"] = 4] = "HideMean";
        MonitorWidgetFlags[MonitorWidgetFlags["HideLast"] = 8] = "HideLast";
        MonitorWidgetFlags[MonitorWidgetFlags["HideGraph"] = 16] = "HideGraph";
        MonitorWidgetFlags[MonitorWidgetFlags["RoundValues"] = 32] = "RoundValues";
    })(MonitorWidgetFlags || (MonitorWidgetFlags = {}));
    var MonitorWidget = (function (_super) {
        __extends(MonitorWidget, _super);
        function MonitorWidget(name, flags, unitName, samples) {
            var _this = _super.call(this, name) || this;
            _this.flags = flags;
            _this.unitName = unitName;
            _this.samples = samples;
            var label = document.createElement("div");
            label.style.cssText = "text-align: center";
            label.textContent = _this.name;
            var text = document.createElement("div");
            if ((flags & MonitorWidgetFlags.HideMin) === 0) {
                _this.minText = document.createElement("div");
                text.appendChild(_this.minText);
            }
            else {
                _this.minText = null;
            }
            if ((flags & MonitorWidgetFlags.HideMax) === 0) {
                _this.maxText = document.createElement("div");
                text.appendChild(_this.maxText);
            }
            else {
                _this.maxText = null;
            }
            if ((flags & MonitorWidgetFlags.HideMean) === 0) {
                _this.meanText = document.createElement("div");
                text.appendChild(_this.meanText);
            }
            else {
                _this.meanText = null;
            }
            if ((flags & MonitorWidgetFlags.HideLast) === 0) {
                _this.lastText = document.createElement("div");
                text.appendChild(_this.lastText);
            }
            else {
                _this.lastText = null;
            }
            _this.element.appendChild(label);
            _this.element.appendChild(text);
            if ((flags & MonitorWidgetFlags.HideGraph) === 0) {
                _this.canvas = document.createElement("canvas");
                _this.canvas.style.cssText = "display: block; padding: 0; margin: 0";
                _this.canvas.width = MonitorGraphWidth;
                _this.canvas.height = MonitorGraphHeight;
                _this.ctx = _this.canvas.getContext("2d");
                _this.element.appendChild(_this.canvas);
            }
            else {
                _this.canvas = null;
                _this.ctx = null;
            }
            return _this;
        }
        MonitorWidget.prototype.sync = function () {
            var _this = this;
            var result = this.samples.calc();
            var scale = MonitorGraphHeight / (result.max * 1.2);
            var min;
            var max;
            var mean;
            var last;
            if ((this.flags & MonitorWidgetFlags.RoundValues) === 0) {
                min = result.min.toFixed(2);
                max = result.max.toFixed(2);
                mean = result.mean.toFixed(2);
                last = result.last.toFixed(2);
            }
            else {
                min = Math.round(result.min).toString();
                max = Math.round(result.max).toString();
                mean = Math.round(result.mean).toString();
                last = Math.round(result.last).toString();
            }
            if (this.minText !== null) {
                this.minText.textContent = "min: \u00A0" + min + this.unitName;
            }
            if (this.maxText !== null) {
                this.maxText.textContent = "max: \u00A0" + max + this.unitName;
            }
            if (this.meanText !== null) {
                this.meanText.textContent = "mean: " + mean + this.unitName;
            }
            if (this.lastText !== null) {
                this.lastText.textContent = "last: " + last + this.unitName;
            }
            if (this.ctx !== null) {
                this.ctx.fillStyle = "#010";
                this.ctx.fillRect(0, 0, MonitorGraphWidth, MonitorGraphHeight);
                this.ctx.fillStyle = "#0f0";
                this.samples.each(function (v, i) {
                    _this.ctx.fillRect(i, MonitorGraphHeight, 1, -(v * scale));
                });
            }
        };
        return MonitorWidget;
    }(Widget));
    var CounterWidget = (function (_super) {
        __extends(CounterWidget, _super);
        function CounterWidget(name, counter) {
            var _this = _super.call(this, name) || this;
            _this.counter = counter;
            _this.text = document.createElement("div");
            _this.element.appendChild(_this.text);
            return _this;
        }
        CounterWidget.prototype.sync = function () {
            this.text.textContent = this.name + ": " + this.counter.value;
        };
        return CounterWidget;
    }(Widget));

    var container = null;
    /**
     * Check that everything is properly initialized.
     */
    function checkInit() {
        if (!container) {
            container = document.createElement("div");
            container.style.cssText = "position: fixed;" +
                "opacity: 0.9;" +
                "right: 0;" +
                "bottom: 0";
            document.body.appendChild(container);
        }
    }
    /**
     * Start FPS monitor
     */
    function startFPSMonitor(flags) {
        if (flags === void 0) { flags = MonitorWidgetFlags.HideMin | MonitorWidgetFlags.HideMax |
            MonitorWidgetFlags.HideMean | MonitorWidgetFlags.RoundValues; }
        checkInit();
        var data = new MonitorSamples(MonitorMaxSamples);
        var w = new MonitorWidget("FPS", flags, "", data);
        container.appendChild(w.element);
        var alpha = 2 / 121;
        var last = 0;
        var fps = 60;
        function update(now) {
            if (last > 0) {
                fps += alpha * ((1000 / (now - last)) - fps);
            }
            last = now;
            data.addSample(fps);
            w.invalidate();
            requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }
    /**
     * Start Memory Monitor
     */
    function startMemMonitor(flags) {
        if (flags === void 0) { flags = MonitorWidgetFlags.HideMin | MonitorWidgetFlags.HideMean; }
        checkInit();
        if (performance.memory === undefined) {
            return;
        }
        var data = new MonitorSamples(MonitorMaxSamples);
        var w = new MonitorWidget("Memory", flags, "MB", data);
        container.appendChild(w.element);
        function update() {
            data.addSample(Math.round(performance.memory.usedJSHeapSize / (1024 * 1024)));
            w.invalidate();
            setTimeout(update, 30);
        }
        update();
    }

    function colors(specifier) {
      var n = specifier.length / 6 | 0, colors = new Array(n), i = 0;
      while (i < n) colors[i] = "#" + specifier.slice(i * 6, ++i * 6);
      return colors;
    }

    function ramp(range) {
      var n = range.length;
      return function(t) {
        return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))];
      };
    }

    var interpolateViridis = ramp(colors("44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725"));

    var magma = ramp(colors("00000401000501010601010802010902020b02020d03030f03031204041405041606051806051a07061c08071e0907200a08220b09240c09260d0a290e0b2b100b2d110c2f120d31130d34140e36150e38160f3b180f3d19103f1a10421c10441d11471e114920114b21114e22115024125325125527125829115a2a115c2c115f2d11612f116331116533106734106936106b38106c390f6e3b0f703d0f713f0f72400f74420f75440f764510774710784910784a10794c117a4e117b4f127b51127c52137c54137d56147d57157e59157e5a167e5c167f5d177f5f187f601880621980641a80651a80671b80681c816a1c816b1d816d1d816e1e81701f81721f817320817521817621817822817922827b23827c23827e24828025828125818326818426818627818827818928818b29818c29818e2a81902a81912b81932b80942c80962c80982d80992d809b2e7f9c2e7f9e2f7fa02f7fa1307ea3307ea5317ea6317da8327daa337dab337cad347cae347bb0357bb2357bb3367ab5367ab73779b83779ba3878bc3978bd3977bf3a77c03a76c23b75c43c75c53c74c73d73c83e73ca3e72cc3f71cd4071cf4070d0416fd2426fd3436ed5446dd6456cd8456cd9466bdb476adc4869de4968df4a68e04c67e24d66e34e65e44f64e55064e75263e85362e95462ea5661eb5760ec5860ed5a5fee5b5eef5d5ef05f5ef1605df2625df2645cf3655cf4675cf4695cf56b5cf66c5cf66e5cf7705cf7725cf8745cf8765cf9785df9795df97b5dfa7d5efa7f5efa815ffb835ffb8560fb8761fc8961fc8a62fc8c63fc8e64fc9065fd9266fd9467fd9668fd9869fd9a6afd9b6bfe9d6cfe9f6dfea16efea36ffea571fea772fea973feaa74feac76feae77feb078feb27afeb47bfeb67cfeb77efeb97ffebb81febd82febf84fec185fec287fec488fec68afec88cfeca8dfecc8ffecd90fecf92fed194fed395fed597fed799fed89afdda9cfddc9efddea0fde0a1fde2a3fde3a5fde5a7fde7a9fde9aafdebacfcecaefceeb0fcf0b2fcf2b4fcf4b6fcf6b8fcf7b9fcf9bbfcfbbdfcfdbf"));

    var inferno = ramp(colors("00000401000501010601010802010a02020c02020e03021004031204031405041706041907051b08051d09061f0a07220b07240c08260d08290e092b10092d110a30120a32140b34150b37160b39180c3c190c3e1b0c411c0c431e0c451f0c48210c4a230c4c240c4f260c51280b53290b552b0b572d0b592f0a5b310a5c320a5e340a5f3609613809623909633b09643d09653e0966400a67420a68440a68450a69470b6a490b6a4a0c6b4c0c6b4d0d6c4f0d6c510e6c520e6d540f6d550f6d57106e59106e5a116e5c126e5d126e5f136e61136e62146e64156e65156e67166e69166e6a176e6c186e6d186e6f196e71196e721a6e741a6e751b6e771c6d781c6d7a1d6d7c1d6d7d1e6d7f1e6c801f6c82206c84206b85216b87216b88226a8a226a8c23698d23698f24699025689225689326679526679727669827669a28659b29649d29649f2a63a02a63a22b62a32c61a52c60a62d60a82e5fa92e5eab2f5ead305dae305cb0315bb1325ab3325ab43359b63458b73557b93556ba3655bc3754bd3853bf3952c03a51c13a50c33b4fc43c4ec63d4dc73e4cc83f4bca404acb4149cc4248ce4347cf4446d04545d24644d34743d44842d54a41d74b3fd84c3ed94d3dda4e3cdb503bdd513ade5238df5337e05536e15635e25734e35933e45a31e55c30e65d2fe75e2ee8602de9612bea632aeb6429eb6628ec6726ed6925ee6a24ef6c23ef6e21f06f20f1711ff1731df2741cf3761bf37819f47918f57b17f57d15f67e14f68013f78212f78410f8850ff8870ef8890cf98b0bf98c0af98e09fa9008fa9207fa9407fb9606fb9706fb9906fb9b06fb9d07fc9f07fca108fca309fca50afca60cfca80dfcaa0ffcac11fcae12fcb014fcb216fcb418fbb61afbb81dfbba1ffbbc21fbbe23fac026fac228fac42afac62df9c72ff9c932f9cb35f8cd37f8cf3af7d13df7d340f6d543f6d746f5d949f5db4cf4dd4ff4df53f4e156f3e35af3e55df2e661f2e865f2ea69f1ec6df1ed71f1ef75f1f179f2f27df2f482f3f586f3f68af4f88ef5f992f6fa96f8fb9af9fc9dfafda1fcffa4"));

    var plasma = ramp(colors("0d088710078813078916078a19068c1b068d1d068e20068f2206902406912605912805922a05932c05942e05952f059631059733059735049837049938049a3a049a3c049b3e049c3f049c41049d43039e44039e46039f48039f4903a04b03a14c02a14e02a25002a25102a35302a35502a45601a45801a45901a55b01a55c01a65e01a66001a66100a76300a76400a76600a76700a86900a86a00a86c00a86e00a86f00a87100a87201a87401a87501a87701a87801a87a02a87b02a87d03a87e03a88004a88104a78305a78405a78606a68707a68808a68a09a58b0aa58d0ba58e0ca48f0da4910ea3920fa39410a29511a19613a19814a099159f9a169f9c179e9d189d9e199da01a9ca11b9ba21d9aa31e9aa51f99a62098a72197a82296aa2395ab2494ac2694ad2793ae2892b02991b12a90b22b8fb32c8eb42e8db52f8cb6308bb7318ab83289ba3388bb3488bc3587bd3786be3885bf3984c03a83c13b82c23c81c33d80c43e7fc5407ec6417dc7427cc8437bc9447aca457acb4679cc4778cc4977cd4a76ce4b75cf4c74d04d73d14e72d24f71d35171d45270d5536fd5546ed6556dd7566cd8576bd9586ada5a6ada5b69db5c68dc5d67dd5e66de5f65de6164df6263e06363e16462e26561e26660e3685fe4695ee56a5de56b5de66c5ce76e5be76f5ae87059e97158e97257ea7457eb7556eb7655ec7754ed7953ed7a52ee7b51ef7c51ef7e50f07f4ff0804ef1814df1834cf2844bf3854bf3874af48849f48948f58b47f58c46f68d45f68f44f79044f79143f79342f89441f89540f9973ff9983ef99a3efa9b3dfa9c3cfa9e3bfb9f3afba139fba238fca338fca537fca636fca835fca934fdab33fdac33fdae32fdaf31fdb130fdb22ffdb42ffdb52efeb72dfeb82cfeba2cfebb2bfebd2afebe2afec029fdc229fdc328fdc527fdc627fdc827fdca26fdcb26fccd25fcce25fcd025fcd225fbd324fbd524fbd724fad824fada24f9dc24f9dd25f8df25f8e125f7e225f7e425f6e626f6e826f5e926f5eb27f4ed27f3ee27f3f027f2f227f1f426f1f525f0f724f0f921"));

    const Layout = {
      PHYLLOTAXIS: 0,
      GRID: 1,
      WAVE: 2,
      SPIRAL: 3,
    };

    const LAYOUT_ORDER = [
      Layout.PHYLLOTAXIS,
      Layout.SPIRAL,
      Layout.PHYLLOTAXIS,
      Layout.GRID,
      Layout.WAVE,
    ];

    /* src\Point.svelte generated by Svelte v3.16.7 */

    const file = "src\\Point.svelte";

    function create_fragment(ctx) {
    	let rect;
    	let rect_transform_value;

    	const block = {
    		c: function create() {
    			rect = svg_element("rect");
    			attr_dev(rect, "class", "point");
    			attr_dev(rect, "transform", rect_transform_value = `translate(${Math.floor(/*x*/ ctx[0])}, ${Math.floor(/*y*/ ctx[1])})`);
    			attr_dev(rect, "fill", /*color*/ ctx[2]);
    			add_location(rect, file, 6, 0, 78);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, rect, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*x, y*/ 3 && rect_transform_value !== (rect_transform_value = `translate(${Math.floor(/*x*/ ctx[0])}, ${Math.floor(/*y*/ ctx[1])})`)) {
    				attr_dev(rect, "transform", rect_transform_value);
    			}

    			if (dirty & /*color*/ 4) {
    				attr_dev(rect, "fill", /*color*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(rect);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { x } = $$props;
    	let { y } = $$props;
    	let { color } = $$props;
    	const writable_props = ["x", "y", "color"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Point> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    	};

    	$$self.$capture_state = () => {
    		return { x, y, color };
    	};

    	$$self.$inject_state = $$props => {
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("color" in $$props) $$invalidate(2, color = $$props.color);
    	};

    	return [x, y, color];
    }

    class Point extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { x: 0, y: 1, color: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Point",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*x*/ ctx[0] === undefined && !("x" in props)) {
    			console.warn("<Point> was created without expected prop 'x'");
    		}

    		if (/*y*/ ctx[1] === undefined && !("y" in props)) {
    			console.warn("<Point> was created without expected prop 'y'");
    		}

    		if (/*color*/ ctx[2] === undefined && !("color" in props)) {
    			console.warn("<Point> was created without expected prop 'color'");
    		}
    	}

    	get x() {
    		throw new Error("<Point>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Point>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Point>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Point>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Point>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Point>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\VizDemo.svelte generated by Svelte v3.16.7 */

    const { Object: Object_1 } = globals;
    const file$1 = "src\\VizDemo.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    // (161:4) {#each points as point}
    function create_each_block(ctx) {
    	let current;

    	const point = new Point({
    			props: {
    				x: /*point*/ ctx[14].x,
    				y: /*point*/ ctx[14].y,
    				color: /*point*/ ctx[14].color
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(point.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(point, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const point_changes = {};
    			if (dirty & /*points*/ 1) point_changes.x = /*point*/ ctx[14].x;
    			if (dirty & /*points*/ 1) point_changes.y = /*point*/ ctx[14].y;
    			if (dirty & /*points*/ 1) point_changes.color = /*point*/ ctx[14].color;
    			point.$set(point_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(point.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(point.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(point, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(161:4) {#each points as point}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let svg;
    	let g;
    	let current;
    	let each_value = /*points*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(g, file$1, 159, 2, 4104);
    			attr_dev(svg, "class", "demo");
    			add_location(svg, file$1, 158, 0, 4082);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(g, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*points*/ 1) {
    				each_value = /*points*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(g, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function xForLayout(layout) {
    	switch (layout) {
    		case Layout.PHYLLOTAXIS:
    			return "px";
    		case Layout.GRID:
    			return "gx";
    		case Layout.WAVE:
    			return "wx";
    		case Layout.SPIRAL:
    			return "sx";
    	}
    }

    function yForLayout(layout) {
    	switch (layout) {
    		case Layout.PHYLLOTAXIS:
    			return "py";
    		case Layout.GRID:
    			return "gy";
    		case Layout.WAVE:
    			return "wy";
    		case Layout.SPIRAL:
    			return "sy";
    	}
    }

    function lerp(obj, percent, startProp, endProp) {
    	let px = obj[startProp];
    	return px + (obj[endProp] - px) * percent;
    }

    function genGrid(n) {
    	let rowLength = Math.round(Math.sqrt(n));

    	return i => [
    		-0.8 + 1.6 / rowLength * (i % rowLength),
    		-0.8 + 1.6 / rowLength * Math.floor(i / rowLength)
    	];
    }

    function genWave(n) {
    	let xScale = 2 / (n - 1);

    	return i => {
    		let x = -1 + i * xScale;
    		return [x, Math.sin(x * Math.PI * 3) * 0.3];
    	};
    }

    function genSpiral(n) {
    	return i => {
    		let t = Math.sqrt(i / (n - 1)), phi = t * Math.PI * 10;
    		return [t * Math.cos(phi), t * Math.sin(phi)];
    	};
    }

    function scale(magnitude, vector) {
    	return vector.map(p => p * magnitude);
    }

    function translate(translation, vector) {
    	return vector.map((p, i) => p + translation[i]);
    }

    function project(vector) {
    	const wh = window.innerHeight / 2;
    	const ww = window.innerWidth / 2;
    	return translate([ww, wh], scale(Math.min(wh, ww), vector));
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { count } = $$props;
    	let points = [];
    	let step = 0;
    	let numSteps = 60 * 2;
    	let layout = 0;
    	const theta = Math.PI * (3 - Math.sqrt(5));

    	function genPhyllotaxis(n) {
    		return i => {
    			let r = Math.sqrt(i / n);
    			let th = i * theta;
    			return [r * Math.cos(th), r * Math.sin(th)];
    		};
    	}

    	function makePoints(count) {
    		const newPoints = [];

    		for (var i = 0; i < count; i++) {
    			newPoints.push({
    				x: 0,
    				y: 0,
    				color: interpolateViridis(i / count)
    			});
    		}

    		setAnchors(newPoints);
    	}

    	function setAnchors(arr) {
    		arr.map((p, index) => {
    			const [gx, gy] = project(grid(index));
    			const [wx, wy] = project(wave(index));
    			const [sx, sy] = project(spiral(index));
    			const [px, py] = project(phyllotaxis(index));
    			Object.assign(p, { gx, gy, wx, wy, sx, sy, px, py });
    		});

    		$$invalidate(0, points = arr);
    	}

    	function next() {
    		step = (step + 1) % numSteps;

    		if (step === 0) {
    			layout = (layout + 1) % LAYOUT_ORDER.length;
    		}

    		const pct = Math.min(1, step / (numSteps * 0.8));
    		const currentLayout = LAYOUT_ORDER[layout];
    		const nextLayout = LAYOUT_ORDER[(layout + 1) % LAYOUT_ORDER.length];
    		const pxProp = xForLayout(currentLayout);
    		const nxProp = xForLayout(nextLayout);
    		const pyProp = yForLayout(currentLayout);
    		const nyProp = yForLayout(nextLayout);

    		$$invalidate(0, points = points.map(point => {
    			const newPoint = { ...point };
    			newPoint.x = lerp(newPoint, pct, pxProp, nxProp);
    			newPoint.y = lerp(newPoint, pct, pyProp, nyProp);
    			return newPoint;
    		}));

    		requestAnimationFrame(() => {
    			next();
    		});
    	}

    	let phyllotaxis = genPhyllotaxis(100);
    	let grid = genGrid(100);
    	let wave = genWave(100);
    	let spiral = genSpiral(100);

    	onMount(() => {
    		next();
    	});

    	const writable_props = ["count"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<VizDemo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("count" in $$props) $$invalidate(1, count = $$props.count);
    	};

    	$$self.$capture_state = () => {
    		return {
    			count,
    			points,
    			step,
    			numSteps,
    			layout,
    			phyllotaxis,
    			grid,
    			wave,
    			spiral
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("count" in $$props) $$invalidate(1, count = $$props.count);
    		if ("points" in $$props) $$invalidate(0, points = $$props.points);
    		if ("step" in $$props) step = $$props.step;
    		if ("numSteps" in $$props) numSteps = $$props.numSteps;
    		if ("layout" in $$props) layout = $$props.layout;
    		if ("phyllotaxis" in $$props) phyllotaxis = $$props.phyllotaxis;
    		if ("grid" in $$props) grid = $$props.grid;
    		if ("wave" in $$props) wave = $$props.wave;
    		if ("spiral" in $$props) spiral = $$props.spiral;
    	};

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*count*/ 2) {
    			 {
    				phyllotaxis = genPhyllotaxis(count);
    				grid = genGrid(count);
    				wave = genWave(count);
    				spiral = genSpiral(count);
    				makePoints(count);
    			}
    		}
    	};

    	return [points, count];
    }

    class VizDemo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { count: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "VizDemo",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (/*count*/ ctx[1] === undefined && !("count" in props)) {
    			console.warn("<VizDemo> was created without expected prop 'count'");
    		}
    	}

    	get count() {
    		throw new Error("<VizDemo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set count(value) {
    		throw new Error("<VizDemo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.16.7 */
    const file$2 = "src\\App.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let t0;
    	let div0;
    	let t1;
    	let input;
    	let input_min_value;
    	let input_max_value;
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let t5;
    	let a;
    	let current;
    	let dispose;

    	const vizdemo = new VizDemo({
    			props: { count: /*numPoints*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			create_component(vizdemo.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			t1 = text("# Points\n    ");
    			input = element("input");
    			t2 = space();
    			t3 = text(/*numPoints*/ ctx[0]);
    			t4 = space();
    			div1 = element("div");
    			t5 = text("Svelte 1k Components Demo based on the Glimmer demo by\n    ");
    			a = element("a");
    			a.textContent = "Michael Lange";
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", input_min_value = 10);
    			attr_dev(input, "max", input_max_value = 10000);
    			add_location(input, file$2, 16, 4, 392);
    			attr_dev(div0, "class", "controls");
    			add_location(div0, file$2, 14, 2, 352);
    			attr_dev(a, "href", "http://mlange.io");
    			attr_dev(a, "target", "_blank");
    			add_location(a, file$2, 21, 4, 569);
    			attr_dev(div1, "class", "about");
    			add_location(div1, file$2, 19, 2, 486);
    			attr_dev(div2, "class", "app-wrapper");
    			add_location(div2, file$2, 12, 0, 292);

    			dispose = [
    				listen_dev(input, "change", /*input_change_input_handler*/ ctx[1]),
    				listen_dev(input, "input", /*input_change_input_handler*/ ctx[1])
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			mount_component(vizdemo, div2, null);
    			append_dev(div2, t0);
    			append_dev(div2, div0);
    			append_dev(div0, t1);
    			append_dev(div0, input);
    			set_input_value(input, /*numPoints*/ ctx[0]);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, t5);
    			append_dev(div1, a);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const vizdemo_changes = {};
    			if (dirty & /*numPoints*/ 1) vizdemo_changes.count = /*numPoints*/ ctx[0];
    			vizdemo.$set(vizdemo_changes);

    			if (dirty & /*numPoints*/ 1) {
    				set_input_value(input, /*numPoints*/ ctx[0]);
    			}

    			if (!current || dirty & /*numPoints*/ 1) set_data_dev(t3, /*numPoints*/ ctx[0]);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(vizdemo.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(vizdemo.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(vizdemo);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let numPoints = 1000;
    	startFPSMonitor();
    	startMemMonitor();

    	function input_change_input_handler() {
    		numPoints = to_number(this.value);
    		$$invalidate(0, numPoints);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("numPoints" in $$props) $$invalidate(0, numPoints = $$props.numPoints);
    	};

    	return [numPoints, input_change_input_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new App({
      target: document.getElementById("root"),
      props: {
        name: "world",
      },
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
