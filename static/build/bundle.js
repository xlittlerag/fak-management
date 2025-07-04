
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
	'use strict';

	/** @returns {void} */
	function noop() {}

	/** @returns {void} */
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

	/**
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function run_all(fns) {
		fns.forEach(run);
	}

	/**
	 * @param {any} thing
	 * @returns {thing is Function}
	 */
	function is_function(thing) {
		return typeof thing === 'function';
	}

	/** @returns {boolean} */
	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
	}

	/** @returns {boolean} */
	function is_empty(obj) {
		return Object.keys(obj).length === 0;
	}

	/** @type {typeof globalThis} */
	const globals =
		typeof window !== 'undefined'
			? window
			: typeof globalThis !== 'undefined'
			? globalThis
			: // @ts-ignore Node typings have this
			  global;

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append(target, node) {
		target.appendChild(node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach(node) {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	/**
	 * @returns {void} */
	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	/**
	 * @template {keyof HTMLElementTagNameMap} K
	 * @param {K} name
	 * @returns {HTMLElementTagNameMap[K]}
	 */
	function element(name) {
		return document.createElement(name);
	}

	/**
	 * @param {string} data
	 * @returns {Text}
	 */
	function text(data) {
		return document.createTextNode(data);
	}

	/**
	 * @returns {Text} */
	function space() {
		return text(' ');
	}

	/**
	 * @param {EventTarget} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @returns {() => void}
	 */
	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	/**
	 * @returns {(event: any) => any} */
	function prevent_default(fn) {
		return function (event) {
			event.preventDefault();
			// @ts-ignore
			return fn.call(this, event);
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
	}

	/**
	 * @param {Element} element
	 * @returns {ChildNode[]}
	 */
	function children(element) {
		return Array.from(element.childNodes);
	}

	/**
	 * @returns {void} */
	function set_input_value(input, value) {
		input.value = value == null ? '' : value;
	}

	/**
	 * @returns {void} */
	function select_option(select, value, mounting) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i];
			if (option.__value === value) {
				option.selected = true;
				return;
			}
		}
		if (!mounting || value !== undefined) {
			select.selectedIndex = -1; // no option should be selected
		}
	}

	function select_value(select) {
		const selected_option = select.querySelector(':checked');
		return selected_option && selected_option.__value;
	}

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
	 * @returns {CustomEvent<T>}
	 */
	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
		return new CustomEvent(type, { detail, bubbles, cancelable });
	}

	/**
	 * @typedef {Node & {
	 * 	claim_order?: number;
	 * 	hydrate_init?: true;
	 * 	actual_end_child?: NodeEx;
	 * 	childNodes: NodeListOf<NodeEx>;
	 * }} NodeEx
	 */

	/** @typedef {ChildNode & NodeEx} ChildNodeEx */

	/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

	/**
	 * @typedef {ChildNodeEx[] & {
	 * 	claim_info?: {
	 * 		last_index: number;
	 * 		total_claimed: number;
	 * 	};
	 * }} ChildNodeArray
	 */

	let current_component;

	/** @returns {void} */
	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error('Function called outside component initialization');
		return current_component;
	}

	/**
	 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
	 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
	 * it can be called from an external module).
	 *
	 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
	 *
	 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
	 *
	 * https://svelte.dev/docs/svelte#onmount
	 * @template T
	 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
	 * @returns {void}
	 */
	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	const dirty_components = [];
	const binding_callbacks = [];

	let render_callbacks = [];

	const flush_callbacks = [];

	const resolved_promise = /* @__PURE__ */ Promise.resolve();

	let update_scheduled = false;

	/** @returns {void} */
	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	/** @returns {void} */
	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	// flush() calls callbacks in this order:
	// 1. All beforeUpdate callbacks, in order: parents before children
	// 2. All bind:this callbacks, in reverse order: children before parents.
	// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
	//    for afterUpdates called during the initial onMount, which are called in
	//    reverse order: children before parents.
	// Since callbacks might update component values, which could trigger another
	// call to flush(), the following steps guard against this:
	// 1. During beforeUpdate, any updated components will be added to the
	//    dirty_components array and will cause a reentrant call to flush(). Because
	//    the flush index is kept outside the function, the reentrant call will pick
	//    up where the earlier call left off and go through all dirty components. The
	//    current_component value is saved and restored so that the reentrant call will
	//    not interfere with the "parent" flush() call.
	// 2. bind:this callbacks cannot trigger new flush() calls.
	// 3. During afterUpdate, any updated components will NOT have their afterUpdate
	//    callback called a second time; the seen_callbacks set, outside the flush()
	//    function, guarantees this behavior.
	const seen_callbacks = new Set();

	let flushidx = 0; // Do *not* move this inside the flush() function

	/** @returns {void} */
	function flush() {
		// Do not reenter flush while dirty components are updated, as this can
		// result in an infinite loop. Instead, let the inner flush handle it.
		// Reentrancy is ok afterwards for bindings etc.
		if (flushidx !== 0) {
			return;
		}
		const saved_component = current_component;
		do {
			// first, call beforeUpdate functions
			// and update components
			try {
				while (flushidx < dirty_components.length) {
					const component = dirty_components[flushidx];
					flushidx++;
					set_current_component(component);
					update(component.$$);
				}
			} catch (e) {
				// reset dirty state to not end up in a deadlocked state and then rethrow
				dirty_components.length = 0;
				flushidx = 0;
				throw e;
			}
			set_current_component(null);
			dirty_components.length = 0;
			flushidx = 0;
			while (binding_callbacks.length) binding_callbacks.pop()();
			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			for (let i = 0; i < render_callbacks.length; i += 1) {
				const callback = render_callbacks[i];
				if (!seen_callbacks.has(callback)) {
					// ...so guard against infinite loops
					seen_callbacks.add(callback);
					callback();
				}
			}
			render_callbacks.length = 0;
		} while (dirty_components.length);
		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}
		update_scheduled = false;
		seen_callbacks.clear();
		set_current_component(saved_component);
	}

	/** @returns {void} */
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

	/**
	 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
	 * @param {Function[]} fns
	 * @returns {void}
	 */
	function flush_render_callbacks(fns) {
		const filtered = [];
		const targets = [];
		render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
		targets.forEach((c) => c());
		render_callbacks = filtered;
	}

	const outroing = new Set();

	/**
	 * @param {import('./private.js').Fragment} block
	 * @param {0 | 1} [local]
	 * @returns {void}
	 */
	function transition_in(block, local) {
		if (block && block.i) {
			outroing.delete(block);
			block.i(local);
		}
	}

	/** @typedef {1} INTRO */
	/** @typedef {0} OUTRO */
	/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
	/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

	/**
	 * @typedef {Object} Outro
	 * @property {number} r
	 * @property {Function[]} c
	 * @property {Object} p
	 */

	/**
	 * @typedef {Object} PendingProgram
	 * @property {number} start
	 * @property {INTRO|OUTRO} b
	 * @property {Outro} [group]
	 */

	/**
	 * @typedef {Object} Program
	 * @property {number} a
	 * @property {INTRO|OUTRO} b
	 * @property {1|-1} d
	 * @property {number} duration
	 * @property {number} start
	 * @property {number} end
	 * @property {Outro} [group]
	 */

	// general each functions:

	function ensure_array_like(array_like_or_iterator) {
		return array_like_or_iterator?.length !== undefined
			? array_like_or_iterator
			: Array.from(array_like_or_iterator);
	}

	// keyed each functions:

	/** @returns {void} */
	function destroy_block(block, lookup) {
		block.d(1);
		lookup.delete(block.key);
	}

	/** @returns {any[]} */
	function update_keyed_each(
		old_blocks,
		dirty,
		get_key,
		dynamic,
		ctx,
		list,
		lookup,
		node,
		destroy,
		create_each_block,
		next,
		get_context
	) {
		let o = old_blocks.length;
		let n = list.length;
		let i = o;
		const old_indexes = {};
		while (i--) old_indexes[old_blocks[i].key] = i;
		const new_blocks = [];
		const new_lookup = new Map();
		const deltas = new Map();
		const updates = [];
		i = n;
		while (i--) {
			const child_ctx = get_context(ctx, list, i);
			const key = get_key(child_ctx);
			let block = lookup.get(key);
			if (!block) {
				block = create_each_block(key, child_ctx);
				block.c();
			} else {
				// defer updates until all the DOM shuffling is done
				updates.push(() => block.p(child_ctx, dirty));
			}
			new_lookup.set(key, (new_blocks[i] = block));
			if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
		}
		const will_move = new Set();
		const did_move = new Set();
		/** @returns {void} */
		function insert(block) {
			transition_in(block, 1);
			block.m(node, next);
			lookup.set(block.key, block);
			next = block.first;
			n--;
		}
		while (o && n) {
			const new_block = new_blocks[n - 1];
			const old_block = old_blocks[o - 1];
			const new_key = new_block.key;
			const old_key = old_block.key;
			if (new_block === old_block) {
				// do nothing
				next = new_block.first;
				o--;
				n--;
			} else if (!new_lookup.has(old_key)) {
				// remove old block
				destroy(old_block, lookup);
				o--;
			} else if (!lookup.has(new_key) || will_move.has(new_key)) {
				insert(new_block);
			} else if (did_move.has(old_key)) {
				o--;
			} else if (deltas.get(new_key) > deltas.get(old_key)) {
				did_move.add(new_key);
				insert(new_block);
			} else {
				will_move.add(old_key);
				o--;
			}
		}
		while (o--) {
			const old_block = old_blocks[o];
			if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
		}
		while (n) insert(new_blocks[n - 1]);
		run_all(updates);
		return new_blocks;
	}

	/** @returns {void} */
	function validate_each_keys(ctx, list, get_context, get_key) {
		const keys = new Map();
		for (let i = 0; i < list.length; i++) {
			const key = get_key(get_context(ctx, list, i));
			if (keys.has(key)) {
				let value = '';
				try {
					value = `with value '${String(key)}' `;
				} catch (e) {
					// can't stringify
				}
				throw new Error(
					`Cannot have duplicate keys in a keyed each: Keys at index ${keys.get(
					key
				)} and ${i} ${value}are duplicates`
				);
			}
			keys.set(key, i);
		}
	}

	/** @returns {void} */
	function mount_component(component, target, anchor) {
		const { fragment, after_update } = component.$$;
		fragment && fragment.m(target, anchor);
		// onMount happens before the initial afterUpdate
		add_render_callback(() => {
			const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
			// if the component was destroyed immediately
			// it will update the `$$.on_destroy` reference to `null`.
			// the destructured on_destroy may still reference to the old array
			if (component.$$.on_destroy) {
				component.$$.on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});
		after_update.forEach(add_render_callback);
	}

	/** @returns {void} */
	function destroy_component(component, detaching) {
		const $$ = component.$$;
		if ($$.fragment !== null) {
			flush_render_callbacks($$.after_update);
			run_all($$.on_destroy);
			$$.fragment && $$.fragment.d(detaching);
			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			$$.on_destroy = $$.fragment = null;
			$$.ctx = [];
		}
	}

	/** @returns {void} */
	function make_dirty(component, i) {
		if (component.$$.dirty[0] === -1) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty.fill(0);
		}
		component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
	}

	// TODO: Document the other params
	/**
	 * @param {SvelteComponent} component
	 * @param {import('./public.js').ComponentConstructorOptions} options
	 *
	 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
	 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
	 * This will be the `add_css` function from the compiled component.
	 *
	 * @returns {void}
	 */
	function init(
		component,
		options,
		instance,
		create_fragment,
		not_equal,
		props,
		append_styles = null,
		dirty = [-1]
	) {
		const parent_component = current_component;
		set_current_component(component);
		/** @type {import('./private.js').T$$} */
		const $$ = (component.$$ = {
			fragment: null,
			ctx: [],
			// state
			props,
			update: noop,
			not_equal,
			bound: blank_object(),
			// lifecycle
			on_mount: [],
			on_destroy: [],
			on_disconnect: [],
			before_update: [],
			after_update: [],
			context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
			// everything else
			callbacks: blank_object(),
			dirty,
			skip_bound: false,
			root: options.target || parent_component.$$.root
		});
		append_styles && append_styles($$.root);
		let ready = false;
		$$.ctx = instance
			? instance(component, options.props || {}, (i, ret, ...rest) => {
					const value = rest.length ? rest[0] : ret;
					if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
						if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
						if (ready) make_dirty(component, i);
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
				// TODO: what is the correct type here?
				// @ts-expect-error
				const nodes = children(options.target);
				$$.fragment && $$.fragment.l(nodes);
				nodes.forEach(detach);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				$$.fragment && $$.fragment.c();
			}
			if (options.intro) transition_in(component.$$.fragment);
			mount_component(component, options.target, options.anchor);
			flush();
		}
		set_current_component(parent_component);
	}

	/**
	 * Base class for Svelte components. Used when dev=false.
	 *
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 */
	class SvelteComponent {
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$ = undefined;
		/**
		 * ### PRIVATE API
		 *
		 * Do not use, may change at any time
		 *
		 * @type {any}
		 */
		$$set = undefined;

		/** @returns {void} */
		$destroy() {
			destroy_component(this, 1);
			this.$destroy = noop;
		}

		/**
		 * @template {Extract<keyof Events, string>} K
		 * @param {K} type
		 * @param {((e: Events[K]) => void) | null | undefined} callback
		 * @returns {() => void}
		 */
		$on(type, callback) {
			if (!is_function(callback)) {
				return noop;
			}
			const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
			callbacks.push(callback);
			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		/**
		 * @param {Partial<Props>} props
		 * @returns {void}
		 */
		$set(props) {
			if (this.$$set && !is_empty(props)) {
				this.$$.skip_bound = true;
				this.$$set(props);
				this.$$.skip_bound = false;
			}
		}
	}

	/**
	 * @typedef {Object} CustomElementPropDefinition
	 * @property {string} [attribute]
	 * @property {boolean} [reflect]
	 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
	 */

	// generated during release, do not modify

	/**
	 * The current version, as set in package.json.
	 *
	 * https://svelte.dev/docs/svelte-compiler#svelte-version
	 * @type {string}
	 */
	const VERSION = '4.2.20';
	const PUBLIC_VERSION = '4';

	/**
	 * @template T
	 * @param {string} type
	 * @param {T} [detail]
	 * @returns {void}
	 */
	function dispatch_dev(type, detail) {
		document.dispatchEvent(custom_event(type, { version: VERSION, ...detail }, { bubbles: true }));
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @returns {void}
	 */
	function append_dev(target, node) {
		dispatch_dev('SvelteDOMInsert', { target, node });
		append(target, node);
	}

	/**
	 * @param {Node} target
	 * @param {Node} node
	 * @param {Node} [anchor]
	 * @returns {void}
	 */
	function insert_dev(target, node, anchor) {
		dispatch_dev('SvelteDOMInsert', { target, node, anchor });
		insert(target, node, anchor);
	}

	/**
	 * @param {Node} node
	 * @returns {void}
	 */
	function detach_dev(node) {
		dispatch_dev('SvelteDOMRemove', { node });
		detach(node);
	}

	/**
	 * @param {Node} node
	 * @param {string} event
	 * @param {EventListenerOrEventListenerObject} handler
	 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
	 * @param {boolean} [has_prevent_default]
	 * @param {boolean} [has_stop_propagation]
	 * @param {boolean} [has_stop_immediate_propagation]
	 * @returns {() => void}
	 */
	function listen_dev(
		node,
		event,
		handler,
		options,
		has_prevent_default,
		has_stop_propagation,
		has_stop_immediate_propagation
	) {
		const modifiers =
			options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
		if (has_prevent_default) modifiers.push('preventDefault');
		if (has_stop_propagation) modifiers.push('stopPropagation');
		if (has_stop_immediate_propagation) modifiers.push('stopImmediatePropagation');
		dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
		const dispose = listen(node, event, handler, options);
		return () => {
			dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
			dispose();
		};
	}

	/**
	 * @param {Element} node
	 * @param {string} attribute
	 * @param {string} [value]
	 * @returns {void}
	 */
	function attr_dev(node, attribute, value) {
		attr(node, attribute, value);
		if (value == null) dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
		else dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
	}

	/**
	 * @param {Text} text
	 * @param {unknown} data
	 * @returns {void}
	 */
	function set_data_dev(text, data) {
		data = '' + data;
		if (text.data === data) return;
		dispatch_dev('SvelteDOMSetData', { node: text, data });
		text.data = /** @type {string} */ (data);
	}

	function ensure_array_like_dev(arg) {
		if (
			typeof arg !== 'string' &&
			!(arg && typeof arg === 'object' && 'length' in arg) &&
			!(typeof Symbol === 'function' && arg && Symbol.iterator in arg)
		) {
			throw new Error('{#each} only works with iterable values.');
		}
		return ensure_array_like(arg);
	}

	/**
	 * @returns {void} */
	function validate_slots(name, slot, keys) {
		for (const slot_key of Object.keys(slot)) {
			if (!~keys.indexOf(slot_key)) {
				console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
			}
		}
	}

	/**
	 * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
	 *
	 * Can be used to create strongly typed Svelte components.
	 *
	 * #### Example:
	 *
	 * You have component library on npm called `component-library`, from which
	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
	 * you want to provide typings. Therefore you create a `index.d.ts`:
	 * ```ts
	 * import { SvelteComponent } from "svelte";
	 * export class MyComponent extends SvelteComponent<{foo: string}> {}
	 * ```
	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
	 * to provide intellisense and to use the component like this in a Svelte file
	 * with TypeScript:
	 * ```svelte
	 * <script lang="ts">
	 * 	import { MyComponent } from "component-library";
	 * </script>
	 * <MyComponent foo={'bar'} />
	 * ```
	 * @template {Record<string, any>} [Props=any]
	 * @template {Record<string, any>} [Events=any]
	 * @template {Record<string, any>} [Slots=any]
	 * @extends {SvelteComponent<Props, Events>}
	 */
	class SvelteComponentDev extends SvelteComponent {
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Props}
		 */
		$$prop_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Events}
		 */
		$$events_def;
		/**
		 * For type checking capabilities only.
		 * Does not exist at runtime.
		 * ### DO NOT USE!
		 *
		 * @type {Slots}
		 */
		$$slot_def;

		/** @param {import('./public.js').ComponentConstructorOptions<Props>} options */
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error("'target' is a required option");
			}
			super();
		}

		/** @returns {void} */
		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn('Component was already destroyed'); // eslint-disable-line no-console
			};
		}

		/** @returns {void} */
		$capture_state() {}

		/** @returns {void} */
		$inject_state() {}
	}

	if (typeof window !== 'undefined')
		// @ts-ignore
		(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

	/* src/App.svelte generated by Svelte v4.2.20 */

	const { Error: Error_1, console: console_1 } = globals;
	const file = "src/App.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[53] = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[56] = list[i];
		return child_ctx;
	}

	function get_each_context_2(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[56] = list[i];
		return child_ctx;
	}

	function get_each_context_3(ctx, list, i) {
		const child_ctx = ctx.slice();
		child_ctx[56] = list[i];
		return child_ctx;
	}

	// (286:16) {#if hasKendo}
	function create_if_block_6(ctx) {
		let div4;
		let div0;
		let label0;
		let t1;
		let select;
		let option;
		let t3;
		let div1;
		let label1;
		let t5;
		let input0;
		let t6;
		let div2;
		let label2;
		let t8;
		let input1;
		let t9;
		let div3;
		let label3;
		let t11;
		let input2;
		let mounted;
		let dispose;
		let each_value_3 = ensure_array_like_dev(/*examLevels*/ ctx[24]);
		let each_blocks = [];

		for (let i = 0; i < each_value_3.length; i += 1) {
			each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
		}

		const block = {
			c: function create() {
				div4 = element("div");
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "Último Examen";
				t1 = space();
				select = element("select");
				option = element("option");
				option.textContent = "Selecciona un nivel";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t3 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Fecha Examen";
				t5 = space();
				input0 = element("input");
				t6 = space();
				div2 = element("div");
				label2 = element("label");
				label2.textContent = "Ciudad Examen";
				t8 = space();
				input1 = element("input");
				t9 = space();
				div3 = element("div");
				label3 = element("label");
				label3.textContent = "Emisor Examen";
				t11 = space();
				input2 = element("input");
				attr_dev(label0, "for", "kendoLastExam");
				attr_dev(label0, "class", "block text-sm font-medium text-gray-700");
				add_location(label0, file, 288, 28, 10606);
				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				option.selected = true;
				add_location(option, file, 290, 32, 10846);
				attr_dev(select, "id", "kendoLastExam");
				attr_dev(select, "class", "form-input svelte-wq693c");
				select.required = true;
				if (/*kendoLastExam*/ ctx[7] === void 0) add_render_callback(() => /*select_change_handler_1*/ ctx[35].call(select));
				add_location(select, file, 289, 28, 10731);
				add_location(div0, file, 287, 24, 10572);
				attr_dev(label1, "for", "kendoExamDate");
				attr_dev(label1, "class", "block text-sm font-medium text-gray-700");
				add_location(label1, file, 297, 28, 11212);
				attr_dev(input0, "type", "date");
				attr_dev(input0, "id", "kendoExamDate");
				attr_dev(input0, "class", "form-input svelte-wq693c");
				input0.required = true;
				add_location(input0, file, 298, 28, 11336);
				add_location(div1, file, 296, 24, 11178);
				attr_dev(label2, "for", "kendoExamCity");
				attr_dev(label2, "class", "block text-sm font-medium text-gray-700");
				add_location(label2, file, 301, 28, 11519);
				attr_dev(input1, "type", "text");
				attr_dev(input1, "id", "kendoExamCity");
				attr_dev(input1, "class", "form-input svelte-wq693c");
				input1.required = true;
				add_location(input1, file, 302, 28, 11644);
				add_location(div2, file, 300, 24, 11485);
				attr_dev(label3, "for", "kendoExamEmissor");
				attr_dev(label3, "class", "block text-sm font-medium text-gray-700");
				add_location(label3, file, 305, 28, 11827);
				attr_dev(input2, "type", "text");
				attr_dev(input2, "id", "kendoExamEmissor");
				attr_dev(input2, "class", "form-input svelte-wq693c");
				input2.required = true;
				add_location(input2, file, 306, 28, 11955);
				add_location(div3, file, 304, 24, 11793);
				attr_dev(div4, "class", "grid grid-cols-1 md:grid-cols-2 gap-4");
				add_location(div4, file, 286, 20, 10496);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div4, anchor);
				append_dev(div4, div0);
				append_dev(div0, label0);
				append_dev(div0, t1);
				append_dev(div0, select);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*kendoLastExam*/ ctx[7], true);
				append_dev(div4, t3);
				append_dev(div4, div1);
				append_dev(div1, label1);
				append_dev(div1, t5);
				append_dev(div1, input0);
				set_input_value(input0, /*kendoExamDate*/ ctx[8]);
				append_dev(div4, t6);
				append_dev(div4, div2);
				append_dev(div2, label2);
				append_dev(div2, t8);
				append_dev(div2, input1);
				set_input_value(input1, /*kendoExamCity*/ ctx[9]);
				append_dev(div4, t9);
				append_dev(div4, div3);
				append_dev(div3, label3);
				append_dev(div3, t11);
				append_dev(div3, input2);
				set_input_value(input2, /*kendoExamEmissor*/ ctx[10]);

				if (!mounted) {
					dispose = [
						listen_dev(select, "change", /*select_change_handler_1*/ ctx[35]),
						listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[36]),
						listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[37]),
						listen_dev(input2, "input", /*input2_input_handler_1*/ ctx[38])
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*examLevels*/ 16777216) {
					each_value_3 = ensure_array_like_dev(/*examLevels*/ ctx[24]);
					let i;

					for (i = 0; i < each_value_3.length; i += 1) {
						const child_ctx = get_each_context_3(ctx, each_value_3, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_3(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_3.length;
				}

				if (dirty[0] & /*kendoLastExam, examLevels*/ 16777344) {
					select_option(select, /*kendoLastExam*/ ctx[7]);
				}

				if (dirty[0] & /*kendoExamDate*/ 256) {
					set_input_value(input0, /*kendoExamDate*/ ctx[8]);
				}

				if (dirty[0] & /*kendoExamCity*/ 512 && input1.value !== /*kendoExamCity*/ ctx[9]) {
					set_input_value(input1, /*kendoExamCity*/ ctx[9]);
				}

				if (dirty[0] & /*kendoExamEmissor*/ 1024 && input2.value !== /*kendoExamEmissor*/ ctx[10]) {
					set_input_value(input2, /*kendoExamEmissor*/ ctx[10]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div4);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_6.name,
			type: "if",
			source: "(286:16) {#if hasKendo}",
			ctx
		});

		return block;
	}

	// (292:32) {#each examLevels as level}
	function create_each_block_3(ctx) {
		let option;
		let t_value = /*level*/ ctx[56] + "";
		let t;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = /*level*/ ctx[56];
				set_input_value(option, option.__value);
				add_location(option, file, 292, 36, 11006);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_3.name,
			type: "each",
			source: "(292:32) {#each examLevels as level}",
			ctx
		});

		return block;
	}

	// (319:16) {#if hasIaido}
	function create_if_block_5(ctx) {
		let div4;
		let div0;
		let label0;
		let t1;
		let select;
		let option;
		let t3;
		let div1;
		let label1;
		let t5;
		let input0;
		let t6;
		let div2;
		let label2;
		let t8;
		let input1;
		let t9;
		let div3;
		let label3;
		let t11;
		let input2;
		let mounted;
		let dispose;
		let each_value_2 = ensure_array_like_dev(/*examLevels*/ ctx[24]);
		let each_blocks = [];

		for (let i = 0; i < each_value_2.length; i += 1) {
			each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
		}

		const block = {
			c: function create() {
				div4 = element("div");
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "Último Examen";
				t1 = space();
				select = element("select");
				option = element("option");
				option.textContent = "Selecciona un nivel";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t3 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Fecha Examen";
				t5 = space();
				input0 = element("input");
				t6 = space();
				div2 = element("div");
				label2 = element("label");
				label2.textContent = "Ciudad Examen";
				t8 = space();
				input1 = element("input");
				t9 = space();
				div3 = element("div");
				label3 = element("label");
				label3.textContent = "Emisor Examen";
				t11 = space();
				input2 = element("input");
				attr_dev(label0, "for", "iaidoLastExam");
				attr_dev(label0, "class", "block text-sm font-medium text-gray-700");
				add_location(label0, file, 321, 28, 12700);
				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				option.selected = true;
				add_location(option, file, 323, 32, 12940);
				attr_dev(select, "id", "iaidoLastExam");
				attr_dev(select, "class", "form-input svelte-wq693c");
				select.required = true;
				if (/*iaidoLastExam*/ ctx[12] === void 0) add_render_callback(() => /*select_change_handler_2*/ ctx[40].call(select));
				add_location(select, file, 322, 28, 12825);
				add_location(div0, file, 320, 24, 12666);
				attr_dev(label1, "for", "iaidoExamDate");
				attr_dev(label1, "class", "block text-sm font-medium text-gray-700");
				add_location(label1, file, 330, 28, 13306);
				attr_dev(input0, "type", "date");
				attr_dev(input0, "id", "iaidoExamDate");
				attr_dev(input0, "class", "form-input svelte-wq693c");
				input0.required = true;
				add_location(input0, file, 331, 28, 13430);
				add_location(div1, file, 329, 24, 13272);
				attr_dev(label2, "for", "iaidoExamCity");
				attr_dev(label2, "class", "block text-sm font-medium text-gray-700");
				add_location(label2, file, 334, 28, 13613);
				attr_dev(input1, "type", "text");
				attr_dev(input1, "id", "iaidoExamCity");
				attr_dev(input1, "class", "form-input svelte-wq693c");
				input1.required = true;
				add_location(input1, file, 335, 28, 13738);
				add_location(div2, file, 333, 24, 13579);
				attr_dev(label3, "for", "iaidoExamEmissor");
				attr_dev(label3, "class", "block text-sm font-medium text-gray-700");
				add_location(label3, file, 338, 28, 13921);
				attr_dev(input2, "type", "text");
				attr_dev(input2, "id", "iaidoExamEmissor");
				attr_dev(input2, "class", "form-input svelte-wq693c");
				input2.required = true;
				add_location(input2, file, 339, 28, 14049);
				add_location(div3, file, 337, 24, 13887);
				attr_dev(div4, "class", "grid grid-cols-1 md:grid-cols-2 gap-4");
				add_location(div4, file, 319, 20, 12590);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div4, anchor);
				append_dev(div4, div0);
				append_dev(div0, label0);
				append_dev(div0, t1);
				append_dev(div0, select);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*iaidoLastExam*/ ctx[12], true);
				append_dev(div4, t3);
				append_dev(div4, div1);
				append_dev(div1, label1);
				append_dev(div1, t5);
				append_dev(div1, input0);
				set_input_value(input0, /*iaidoExamDate*/ ctx[13]);
				append_dev(div4, t6);
				append_dev(div4, div2);
				append_dev(div2, label2);
				append_dev(div2, t8);
				append_dev(div2, input1);
				set_input_value(input1, /*iaidoExamCity*/ ctx[14]);
				append_dev(div4, t9);
				append_dev(div4, div3);
				append_dev(div3, label3);
				append_dev(div3, t11);
				append_dev(div3, input2);
				set_input_value(input2, /*iaidoExamEmissor*/ ctx[15]);

				if (!mounted) {
					dispose = [
						listen_dev(select, "change", /*select_change_handler_2*/ ctx[40]),
						listen_dev(input0, "input", /*input0_input_handler_2*/ ctx[41]),
						listen_dev(input1, "input", /*input1_input_handler_2*/ ctx[42]),
						listen_dev(input2, "input", /*input2_input_handler_2*/ ctx[43])
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*examLevels*/ 16777216) {
					each_value_2 = ensure_array_like_dev(/*examLevels*/ ctx[24]);
					let i;

					for (i = 0; i < each_value_2.length; i += 1) {
						const child_ctx = get_each_context_2(ctx, each_value_2, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_2(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_2.length;
				}

				if (dirty[0] & /*iaidoLastExam, examLevels*/ 16781312) {
					select_option(select, /*iaidoLastExam*/ ctx[12]);
				}

				if (dirty[0] & /*iaidoExamDate*/ 8192) {
					set_input_value(input0, /*iaidoExamDate*/ ctx[13]);
				}

				if (dirty[0] & /*iaidoExamCity*/ 16384 && input1.value !== /*iaidoExamCity*/ ctx[14]) {
					set_input_value(input1, /*iaidoExamCity*/ ctx[14]);
				}

				if (dirty[0] & /*iaidoExamEmissor*/ 32768 && input2.value !== /*iaidoExamEmissor*/ ctx[15]) {
					set_input_value(input2, /*iaidoExamEmissor*/ ctx[15]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div4);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_5.name,
			type: "if",
			source: "(319:16) {#if hasIaido}",
			ctx
		});

		return block;
	}

	// (325:32) {#each examLevels as level}
	function create_each_block_2(ctx) {
		let option;
		let t_value = /*level*/ ctx[56] + "";
		let t;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = /*level*/ ctx[56];
				set_input_value(option, option.__value);
				add_location(option, file, 325, 36, 13100);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_2.name,
			type: "each",
			source: "(325:32) {#each examLevels as level}",
			ctx
		});

		return block;
	}

	// (352:16) {#if hasJodo}
	function create_if_block_4(ctx) {
		let div4;
		let div0;
		let label0;
		let t1;
		let select;
		let option;
		let t3;
		let div1;
		let label1;
		let t5;
		let input0;
		let t6;
		let div2;
		let label2;
		let t8;
		let input1;
		let t9;
		let div3;
		let label3;
		let t11;
		let input2;
		let mounted;
		let dispose;
		let each_value_1 = ensure_array_like_dev(/*examLevels*/ ctx[24]);
		let each_blocks = [];

		for (let i = 0; i < each_value_1.length; i += 1) {
			each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		const block = {
			c: function create() {
				div4 = element("div");
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "Último Examen";
				t1 = space();
				select = element("select");
				option = element("option");
				option.textContent = "Selecciona un nivel";

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t3 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Fecha Examen";
				t5 = space();
				input0 = element("input");
				t6 = space();
				div2 = element("div");
				label2 = element("label");
				label2.textContent = "Ciudad Examen";
				t8 = space();
				input1 = element("input");
				t9 = space();
				div3 = element("div");
				label3 = element("label");
				label3.textContent = "Emisor Examen";
				t11 = space();
				input2 = element("input");
				attr_dev(label0, "for", "jodoLastExam");
				attr_dev(label0, "class", "block text-sm font-medium text-gray-700");
				add_location(label0, file, 354, 28, 14790);
				option.__value = "";
				set_input_value(option, option.__value);
				option.disabled = true;
				option.selected = true;
				add_location(option, file, 356, 32, 15027);
				attr_dev(select, "id", "jodoLastExam");
				attr_dev(select, "class", "form-input svelte-wq693c");
				select.required = true;
				if (/*jodoLastExam*/ ctx[17] === void 0) add_render_callback(() => /*select_change_handler_3*/ ctx[45].call(select));
				add_location(select, file, 355, 28, 14914);
				add_location(div0, file, 353, 24, 14756);
				attr_dev(label1, "for", "jodoExamDate");
				attr_dev(label1, "class", "block text-sm font-medium text-gray-700");
				add_location(label1, file, 363, 28, 15393);
				attr_dev(input0, "type", "date");
				attr_dev(input0, "id", "jodoExamDate");
				attr_dev(input0, "class", "form-input svelte-wq693c");
				input0.required = true;
				add_location(input0, file, 364, 28, 15516);
				add_location(div1, file, 362, 24, 15359);
				attr_dev(label2, "for", "jodoExamCity");
				attr_dev(label2, "class", "block text-sm font-medium text-gray-700");
				add_location(label2, file, 367, 28, 15697);
				attr_dev(input1, "type", "text");
				attr_dev(input1, "id", "jodoExamCity");
				attr_dev(input1, "class", "form-input svelte-wq693c");
				input1.required = true;
				add_location(input1, file, 368, 28, 15821);
				add_location(div2, file, 366, 24, 15663);
				attr_dev(label3, "for", "jodoExamEmissor");
				attr_dev(label3, "class", "block text-sm font-medium text-gray-700");
				add_location(label3, file, 371, 28, 16002);
				attr_dev(input2, "type", "text");
				attr_dev(input2, "id", "jodoExamEmissor");
				attr_dev(input2, "class", "form-input svelte-wq693c");
				input2.required = true;
				add_location(input2, file, 372, 28, 16129);
				add_location(div3, file, 370, 24, 15968);
				attr_dev(div4, "class", "grid grid-cols-1 md:grid-cols-2 gap-4");
				add_location(div4, file, 352, 20, 14680);
			},
			m: function mount(target, anchor) {
				insert_dev(target, div4, anchor);
				append_dev(div4, div0);
				append_dev(div0, label0);
				append_dev(div0, t1);
				append_dev(div0, select);
				append_dev(select, option);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(select, null);
					}
				}

				select_option(select, /*jodoLastExam*/ ctx[17], true);
				append_dev(div4, t3);
				append_dev(div4, div1);
				append_dev(div1, label1);
				append_dev(div1, t5);
				append_dev(div1, input0);
				set_input_value(input0, /*jodoExamDate*/ ctx[18]);
				append_dev(div4, t6);
				append_dev(div4, div2);
				append_dev(div2, label2);
				append_dev(div2, t8);
				append_dev(div2, input1);
				set_input_value(input1, /*jodoExamCity*/ ctx[19]);
				append_dev(div4, t9);
				append_dev(div4, div3);
				append_dev(div3, label3);
				append_dev(div3, t11);
				append_dev(div3, input2);
				set_input_value(input2, /*jodoExamEmissor*/ ctx[20]);

				if (!mounted) {
					dispose = [
						listen_dev(select, "change", /*select_change_handler_3*/ ctx[45]),
						listen_dev(input0, "input", /*input0_input_handler_3*/ ctx[46]),
						listen_dev(input1, "input", /*input1_input_handler_3*/ ctx[47]),
						listen_dev(input2, "input", /*input2_input_handler_3*/ ctx[48])
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*examLevels*/ 16777216) {
					each_value_1 = ensure_array_like_dev(/*examLevels*/ ctx[24]);
					let i;

					for (i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks[i]) {
							each_blocks[i].p(child_ctx, dirty);
						} else {
							each_blocks[i] = create_each_block_1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(select, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}

					each_blocks.length = each_value_1.length;
				}

				if (dirty[0] & /*jodoLastExam, examLevels*/ 16908288) {
					select_option(select, /*jodoLastExam*/ ctx[17]);
				}

				if (dirty[0] & /*jodoExamDate*/ 262144) {
					set_input_value(input0, /*jodoExamDate*/ ctx[18]);
				}

				if (dirty[0] & /*jodoExamCity*/ 524288 && input1.value !== /*jodoExamCity*/ ctx[19]) {
					set_input_value(input1, /*jodoExamCity*/ ctx[19]);
				}

				if (dirty[0] & /*jodoExamEmissor*/ 1048576 && input2.value !== /*jodoExamEmissor*/ ctx[20]) {
					set_input_value(input2, /*jodoExamEmissor*/ ctx[20]);
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div4);
				}

				destroy_each(each_blocks, detaching);
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_4.name,
			type: "if",
			source: "(352:16) {#if hasJodo}",
			ctx
		});

		return block;
	}

	// (358:32) {#each examLevels as level}
	function create_each_block_1(ctx) {
		let option;
		let t_value = /*level*/ ctx[56] + "";
		let t;

		const block = {
			c: function create() {
				option = element("option");
				t = text(t_value);
				option.__value = /*level*/ ctx[56];
				set_input_value(option, option.__value);
				add_location(option, file, 358, 36, 15187);
			},
			m: function mount(target, anchor) {
				insert_dev(target, option, anchor);
				append_dev(option, t);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(option);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block_1.name,
			type: "each",
			source: "(358:32) {#each examLevels as level}",
			ctx
		});

		return block;
	}

	// (382:16) {#if showCancelEdit}
	function create_if_block_3(ctx) {
		let button;
		let mounted;
		let dispose;

		const block = {
			c: function create() {
				button = element("button");
				button.textContent = "Cancelar Edición";
				attr_dev(button, "type", "button");
				attr_dev(button, "class", "btn-primary flex-1 bg-gray-500 hover:bg-gray-600 svelte-wq693c");
				add_location(button, file, 382, 20, 16564);
			},
			m: function mount(target, anchor) {
				insert_dev(target, button, anchor);

				if (!mounted) {
					dispose = listen_dev(button, "click", /*resetForm*/ ctx[28], false, false, false, false);
					mounted = true;
				}
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(button);
				}

				mounted = false;
				dispose();
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_3.name,
			type: "if",
			source: "(382:16) {#if showCancelEdit}",
			ctx
		});

		return block;
	}

	// (440:24) {:else}
	function create_else_block_3(ctx) {
		let tr;
		let td;
		let t1;

		const block = {
			c: function create() {
				tr = element("tr");
				td = element("td");
				td.textContent = "No se encontraron asociados. ¡Agrega uno arriba!";
				t1 = space();
				attr_dev(td, "colspan", "8");
				attr_dev(td, "class", "table-cell text-center text-gray-500 svelte-wq693c");
				add_location(td, file, 441, 32, 20188);
				add_location(tr, file, 440, 28, 20151);
			},
			m: function mount(target, anchor) {
				insert_dev(target, tr, anchor);
				append_dev(tr, td);
				append_dev(tr, t1);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(tr);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_3.name,
			type: "else",
			source: "(440:24) {:else}",
			ctx
		});

		return block;
	}

	// (417:36) {:else}
	function create_else_block_2(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("N/A");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_2.name,
			type: "else",
			source: "(417:36) {:else}",
			ctx
		});

		return block;
	}

	// (415:36) {#if associate.kendo}
	function create_if_block_2(ctx) {
		let t0_value = /*associate*/ ctx[53].kendo.lastExam + "";
		let t0;
		let t1;
		let t2_value = formatDate(/*associate*/ ctx[53].kendo.examDate) + "";
		let t2;
		let t3;
		let t4_value = /*associate*/ ctx[53].kendo.examCity + "";
		let t4;
		let t5;
		let t6_value = /*associate*/ ctx[53].kendo.examEmissor + "";
		let t6;

		const block = {
			c: function create() {
				t0 = text(t0_value);
				t1 = text(" (");
				t2 = text(t2_value);
				t3 = text(") en ");
				t4 = text(t4_value);
				t5 = text(" por ");
				t6 = text(t6_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, t2, anchor);
				insert_dev(target, t3, anchor);
				insert_dev(target, t4, anchor);
				insert_dev(target, t5, anchor);
				insert_dev(target, t6, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*associates*/ 1 && t0_value !== (t0_value = /*associate*/ ctx[53].kendo.lastExam + "")) set_data_dev(t0, t0_value);
				if (dirty[0] & /*associates*/ 1 && t2_value !== (t2_value = formatDate(/*associate*/ ctx[53].kendo.examDate) + "")) set_data_dev(t2, t2_value);
				if (dirty[0] & /*associates*/ 1 && t4_value !== (t4_value = /*associate*/ ctx[53].kendo.examCity + "")) set_data_dev(t4, t4_value);
				if (dirty[0] & /*associates*/ 1 && t6_value !== (t6_value = /*associate*/ ctx[53].kendo.examEmissor + "")) set_data_dev(t6, t6_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
					detach_dev(t4);
					detach_dev(t5);
					detach_dev(t6);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_2.name,
			type: "if",
			source: "(415:36) {#if associate.kendo}",
			ctx
		});

		return block;
	}

	// (424:36) {:else}
	function create_else_block_1(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("N/A");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block_1.name,
			type: "else",
			source: "(424:36) {:else}",
			ctx
		});

		return block;
	}

	// (422:36) {#if associate.iaido}
	function create_if_block_1(ctx) {
		let t0_value = /*associate*/ ctx[53].iaido.lastExam + "";
		let t0;
		let t1;
		let t2_value = formatDate(/*associate*/ ctx[53].iaido.examDate) + "";
		let t2;
		let t3;
		let t4_value = /*associate*/ ctx[53].iaido.examCity + "";
		let t4;
		let t5;
		let t6_value = /*associate*/ ctx[53].iaido.examEmissor + "";
		let t6;

		const block = {
			c: function create() {
				t0 = text(t0_value);
				t1 = text(" (");
				t2 = text(t2_value);
				t3 = text(") en ");
				t4 = text(t4_value);
				t5 = text(" por ");
				t6 = text(t6_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, t2, anchor);
				insert_dev(target, t3, anchor);
				insert_dev(target, t4, anchor);
				insert_dev(target, t5, anchor);
				insert_dev(target, t6, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*associates*/ 1 && t0_value !== (t0_value = /*associate*/ ctx[53].iaido.lastExam + "")) set_data_dev(t0, t0_value);
				if (dirty[0] & /*associates*/ 1 && t2_value !== (t2_value = formatDate(/*associate*/ ctx[53].iaido.examDate) + "")) set_data_dev(t2, t2_value);
				if (dirty[0] & /*associates*/ 1 && t4_value !== (t4_value = /*associate*/ ctx[53].iaido.examCity + "")) set_data_dev(t4, t4_value);
				if (dirty[0] & /*associates*/ 1 && t6_value !== (t6_value = /*associate*/ ctx[53].iaido.examEmissor + "")) set_data_dev(t6, t6_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
					detach_dev(t4);
					detach_dev(t5);
					detach_dev(t6);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block_1.name,
			type: "if",
			source: "(422:36) {#if associate.iaido}",
			ctx
		});

		return block;
	}

	// (431:36) {:else}
	function create_else_block(ctx) {
		let t;

		const block = {
			c: function create() {
				t = text("N/A");
			},
			m: function mount(target, anchor) {
				insert_dev(target, t, anchor);
			},
			p: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_else_block.name,
			type: "else",
			source: "(431:36) {:else}",
			ctx
		});

		return block;
	}

	// (429:36) {#if associate.jodo}
	function create_if_block(ctx) {
		let t0_value = /*associate*/ ctx[53].jodo.lastExam + "";
		let t0;
		let t1;
		let t2_value = formatDate(/*associate*/ ctx[53].jodo.examDate) + "";
		let t2;
		let t3;
		let t4_value = /*associate*/ ctx[53].jodo.examCity + "";
		let t4;
		let t5;
		let t6_value = /*associate*/ ctx[53].jodo.examEmissor + "";
		let t6;

		const block = {
			c: function create() {
				t0 = text(t0_value);
				t1 = text(" (");
				t2 = text(t2_value);
				t3 = text(") en ");
				t4 = text(t4_value);
				t5 = text(" por ");
				t6 = text(t6_value);
			},
			m: function mount(target, anchor) {
				insert_dev(target, t0, anchor);
				insert_dev(target, t1, anchor);
				insert_dev(target, t2, anchor);
				insert_dev(target, t3, anchor);
				insert_dev(target, t4, anchor);
				insert_dev(target, t5, anchor);
				insert_dev(target, t6, anchor);
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*associates*/ 1 && t0_value !== (t0_value = /*associate*/ ctx[53].jodo.lastExam + "")) set_data_dev(t0, t0_value);
				if (dirty[0] & /*associates*/ 1 && t2_value !== (t2_value = formatDate(/*associate*/ ctx[53].jodo.examDate) + "")) set_data_dev(t2, t2_value);
				if (dirty[0] & /*associates*/ 1 && t4_value !== (t4_value = /*associate*/ ctx[53].jodo.examCity + "")) set_data_dev(t4, t4_value);
				if (dirty[0] & /*associates*/ 1 && t6_value !== (t6_value = /*associate*/ ctx[53].jodo.examEmissor + "")) set_data_dev(t6, t6_value);
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(t0);
					detach_dev(t1);
					detach_dev(t2);
					detach_dev(t3);
					detach_dev(t4);
					detach_dev(t5);
					detach_dev(t6);
				}
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_if_block.name,
			type: "if",
			source: "(429:36) {#if associate.jodo}",
			ctx
		});

		return block;
	}

	// (408:24) {#each associates as associate (associate.ID)}
	function create_each_block(key_1, ctx) {
		let tr;
		let td0;
		let t0_value = /*associate*/ ctx[53].idNumber + "";
		let t0;
		let t1;
		let td1;
		let t2_value = /*associate*/ ctx[53].firstName + "";
		let t2;
		let t3;
		let t4_value = /*associate*/ ctx[53].lastName + "";
		let t4;
		let t5;
		let td2;
		let t6_value = formatDate(/*associate*/ ctx[53].birthday) + "";
		let t6;
		let t7;
		let td3;
		let t8_value = formatStatus(/*associate*/ ctx[53].status) + "";
		let t8;
		let t9;
		let td4;
		let t10;
		let td5;
		let t11;
		let td6;
		let t12;
		let td7;
		let button0;
		let t14;
		let button1;
		let t16;
		let mounted;
		let dispose;

		function select_block_type(ctx, dirty) {
			if (/*associate*/ ctx[53].kendo) return create_if_block_2;
			return create_else_block_2;
		}

		let current_block_type = select_block_type(ctx);
		let if_block0 = current_block_type(ctx);

		function select_block_type_1(ctx, dirty) {
			if (/*associate*/ ctx[53].iaido) return create_if_block_1;
			return create_else_block_1;
		}

		let current_block_type_1 = select_block_type_1(ctx);
		let if_block1 = current_block_type_1(ctx);

		function select_block_type_2(ctx, dirty) {
			if (/*associate*/ ctx[53].jodo) return create_if_block;
			return create_else_block;
		}

		let current_block_type_2 = select_block_type_2(ctx);
		let if_block2 = current_block_type_2(ctx);

		function click_handler() {
			return /*click_handler*/ ctx[49](/*associate*/ ctx[53]);
		}

		function click_handler_1() {
			return /*click_handler_1*/ ctx[50](/*associate*/ ctx[53]);
		}

		const block = {
			key: key_1,
			first: null,
			c: function create() {
				tr = element("tr");
				td0 = element("td");
				t0 = text(t0_value);
				t1 = space();
				td1 = element("td");
				t2 = text(t2_value);
				t3 = space();
				t4 = text(t4_value);
				t5 = space();
				td2 = element("td");
				t6 = text(t6_value);
				t7 = space();
				td3 = element("td");
				t8 = text(t8_value);
				t9 = space();
				td4 = element("td");
				if_block0.c();
				t10 = space();
				td5 = element("td");
				if_block1.c();
				t11 = space();
				td6 = element("td");
				if_block2.c();
				t12 = space();
				td7 = element("td");
				button0 = element("button");
				button0.textContent = "Editar";
				t14 = space();
				button1 = element("button");
				button1.textContent = "Eliminar";
				t16 = space();
				attr_dev(td0, "class", "table-cell font-medium svelte-wq693c");
				add_location(td0, file, 409, 32, 17990);
				attr_dev(td1, "class", "table-cell svelte-wq693c");
				add_location(td1, file, 410, 32, 18083);
				attr_dev(td2, "class", "table-cell svelte-wq693c");
				add_location(td2, file, 411, 32, 18186);
				attr_dev(td3, "class", "table-cell capitalize svelte-wq693c");
				add_location(td3, file, 412, 32, 18279);
				attr_dev(td4, "class", "table-cell svelte-wq693c");
				add_location(td4, file, 413, 32, 18383);
				attr_dev(td5, "class", "table-cell svelte-wq693c");
				add_location(td5, file, 420, 32, 18837);
				attr_dev(td6, "class", "table-cell svelte-wq693c");
				add_location(td6, file, 427, 32, 19291);
				attr_dev(button0, "class", "btn-edit mr-2 svelte-wq693c");
				add_location(button0, file, 435, 36, 19800);
				attr_dev(button1, "class", "btn-danger svelte-wq693c");
				add_location(button1, file, 436, 36, 19927);
				attr_dev(td7, "class", "table-cell svelte-wq693c");
				add_location(td7, file, 434, 32, 19740);
				add_location(tr, file, 408, 28, 17953);
				this.first = tr;
			},
			m: function mount(target, anchor) {
				insert_dev(target, tr, anchor);
				append_dev(tr, td0);
				append_dev(td0, t0);
				append_dev(tr, t1);
				append_dev(tr, td1);
				append_dev(td1, t2);
				append_dev(td1, t3);
				append_dev(td1, t4);
				append_dev(tr, t5);
				append_dev(tr, td2);
				append_dev(td2, t6);
				append_dev(tr, t7);
				append_dev(tr, td3);
				append_dev(td3, t8);
				append_dev(tr, t9);
				append_dev(tr, td4);
				if_block0.m(td4, null);
				append_dev(tr, t10);
				append_dev(tr, td5);
				if_block1.m(td5, null);
				append_dev(tr, t11);
				append_dev(tr, td6);
				if_block2.m(td6, null);
				append_dev(tr, t12);
				append_dev(tr, td7);
				append_dev(td7, button0);
				append_dev(td7, t14);
				append_dev(td7, button1);
				append_dev(tr, t16);

				if (!mounted) {
					dispose = [
						listen_dev(button0, "click", click_handler, false, false, false, false),
						listen_dev(button1, "click", click_handler_1, false, false, false, false)
					];

					mounted = true;
				}
			},
			p: function update(new_ctx, dirty) {
				ctx = new_ctx;
				if (dirty[0] & /*associates*/ 1 && t0_value !== (t0_value = /*associate*/ ctx[53].idNumber + "")) set_data_dev(t0, t0_value);
				if (dirty[0] & /*associates*/ 1 && t2_value !== (t2_value = /*associate*/ ctx[53].firstName + "")) set_data_dev(t2, t2_value);
				if (dirty[0] & /*associates*/ 1 && t4_value !== (t4_value = /*associate*/ ctx[53].lastName + "")) set_data_dev(t4, t4_value);
				if (dirty[0] & /*associates*/ 1 && t6_value !== (t6_value = formatDate(/*associate*/ ctx[53].birthday) + "")) set_data_dev(t6, t6_value);
				if (dirty[0] & /*associates*/ 1 && t8_value !== (t8_value = formatStatus(/*associate*/ ctx[53].status) + "")) set_data_dev(t8, t8_value);

				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(ctx);

					if (if_block0) {
						if_block0.c();
						if_block0.m(td4, null);
					}
				}

				if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type_1(ctx);

					if (if_block1) {
						if_block1.c();
						if_block1.m(td5, null);
					}
				}

				if (current_block_type_2 === (current_block_type_2 = select_block_type_2(ctx)) && if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2.d(1);
					if_block2 = current_block_type_2(ctx);

					if (if_block2) {
						if_block2.c();
						if_block2.m(td6, null);
					}
				}
			},
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(tr);
				}

				if_block0.d();
				if_block1.d();
				if_block2.d();
				mounted = false;
				run_all(dispose);
			}
		};

		dispatch_dev("SvelteRegisterBlock", {
			block,
			id: create_each_block.name,
			type: "each",
			source: "(408:24) {#each associates as associate (associate.ID)}",
			ctx
		});

		return block;
	}

	function create_fragment(ctx) {
		let div14;
		let h1;
		let t1;
		let div10;
		let h20;
		let t2;
		let t3;
		let form;
		let div5;
		let div0;
		let label0;
		let t5;
		let input0;
		let t6;
		let div1;
		let label1;
		let t8;
		let input1;
		let t9;
		let div2;
		let label2;
		let t11;
		let input2;
		let t12;
		let div3;
		let label3;
		let t14;
		let input3;
		let t15;
		let div4;
		let label4;
		let t17;
		let select;
		let option0;
		let option1;
		let option2;
		let t21;
		let div6;
		let label5;
		let input4;
		let t22;
		let t23;
		let t24;
		let div7;
		let label6;
		let input5;
		let t25;
		let t26;
		let t27;
		let div8;
		let label7;
		let input6;
		let t28;
		let t29;
		let t30;
		let div9;
		let button;
		let t31;
		let t32;
		let t33;
		let div13;
		let div12;
		let h21;
		let t35;
		let div11;
		let table;
		let thead;
		let tr;
		let th0;
		let t37;
		let th1;
		let t39;
		let th2;
		let t41;
		let th3;
		let t43;
		let th4;
		let t45;
		let th5;
		let t47;
		let th6;
		let t49;
		let th7;
		let t51;
		let tbody;
		let each_blocks = [];
		let each_1_lookup = new Map();
		let mounted;
		let dispose;
		let if_block0 = /*hasKendo*/ ctx[6] && create_if_block_6(ctx);
		let if_block1 = /*hasIaido*/ ctx[11] && create_if_block_5(ctx);
		let if_block2 = /*hasJodo*/ ctx[16] && create_if_block_4(ctx);
		let if_block3 = /*showCancelEdit*/ ctx[23] && create_if_block_3(ctx);
		let each_value = ensure_array_like_dev(/*associates*/ ctx[0]);
		const get_key = ctx => /*associate*/ ctx[53].ID;
		validate_each_keys(ctx, each_value, get_each_context, get_key);

		for (let i = 0; i < each_value.length; i += 1) {
			let child_ctx = get_each_context(ctx, each_value, i);
			let key = get_key(child_ctx);
			each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
		}

		let each_1_else = null;

		if (!each_value.length) {
			each_1_else = create_else_block_3(ctx);
		}

		const block = {
			c: function create() {
				div14 = element("div");
				h1 = element("h1");
				h1.textContent = "Registro de Asociados - Federación Argentina de Kendo";
				t1 = space();
				div10 = element("div");
				h20 = element("h2");
				t2 = text(/*formTitle*/ ctx[21]);
				t3 = space();
				form = element("form");
				div5 = element("div");
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "Nº Identificación";
				t5 = space();
				input0 = element("input");
				t6 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Nombre";
				t8 = space();
				input1 = element("input");
				t9 = space();
				div2 = element("div");
				label2 = element("label");
				label2.textContent = "Apellido";
				t11 = space();
				input2 = element("input");
				t12 = space();
				div3 = element("div");
				label3 = element("label");
				label3.textContent = "Fecha de Nacimiento";
				t14 = space();
				input3 = element("input");
				t15 = space();
				div4 = element("div");
				label4 = element("label");
				label4.textContent = "Estado";
				t17 = space();
				select = element("select");
				option0 = element("option");
				option0.textContent = "Activo";
				option1 = element("option");
				option1.textContent = "En Deuda";
				option2 = element("option");
				option2.textContent = "Inactivo";
				t21 = space();
				div6 = element("div");
				label5 = element("label");
				input4 = element("input");
				t22 = text("\n                    Registro Kendo");
				t23 = space();
				if (if_block0) if_block0.c();
				t24 = space();
				div7 = element("div");
				label6 = element("label");
				input5 = element("input");
				t25 = text("\n                    Registro Iaido");
				t26 = space();
				if (if_block1) if_block1.c();
				t27 = space();
				div8 = element("div");
				label7 = element("label");
				input6 = element("input");
				t28 = text("\n                    Registro Jodo");
				t29 = space();
				if (if_block2) if_block2.c();
				t30 = space();
				div9 = element("div");
				button = element("button");
				t31 = text(/*submitButtonText*/ ctx[22]);
				t32 = space();
				if (if_block3) if_block3.c();
				t33 = space();
				div13 = element("div");
				div12 = element("div");
				h21 = element("h2");
				h21.textContent = "Asociados Actuales";
				t35 = space();
				div11 = element("div");
				table = element("table");
				thead = element("thead");
				tr = element("tr");
				th0 = element("th");
				th0.textContent = "Nº Identificación";
				t37 = space();
				th1 = element("th");
				th1.textContent = "Nombre Completo";
				t39 = space();
				th2 = element("th");
				th2.textContent = "Fecha Nacimiento";
				t41 = space();
				th3 = element("th");
				th3.textContent = "Estado";
				t43 = space();
				th4 = element("th");
				th4.textContent = "Examen Kendo";
				t45 = space();
				th5 = element("th");
				th5.textContent = "Examen Iaido";
				t47 = space();
				th6 = element("th");
				th6.textContent = "Examen Jodo";
				t49 = space();
				th7 = element("th");
				th7.textContent = "Acciones";
				t51 = space();
				tbody = element("tbody");

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				if (each_1_else) {
					each_1_else.c();
				}

				attr_dev(h1, "class", "text-3xl font-bold text-center text-gray-800 mb-6");
				add_location(h1, file, 245, 4, 8025);
				attr_dev(h20, "class", "text-2xl font-semibold text-gray-700 mb-4");
				add_location(h20, file, 249, 8, 8286);
				attr_dev(label0, "for", "idNumber");
				attr_dev(label0, "class", "block text-sm font-medium text-gray-700");
				add_location(label0, file, 254, 20, 8574);
				attr_dev(input0, "type", "text");
				attr_dev(input0, "id", "idNumber");
				input0.required = true;
				attr_dev(input0, "class", "form-input svelte-wq693c");
				add_location(input0, file, 255, 20, 8690);
				add_location(div0, file, 253, 16, 8548);
				attr_dev(label1, "for", "firstName");
				attr_dev(label1, "class", "block text-sm font-medium text-gray-700");
				add_location(label1, file, 258, 20, 8839);
				attr_dev(input1, "type", "text");
				attr_dev(input1, "id", "firstName");
				input1.required = true;
				attr_dev(input1, "class", "form-input svelte-wq693c");
				add_location(input1, file, 259, 20, 8945);
				add_location(div1, file, 257, 16, 8813);
				attr_dev(label2, "for", "lastName");
				attr_dev(label2, "class", "block text-sm font-medium text-gray-700");
				add_location(label2, file, 262, 20, 9096);
				attr_dev(input2, "type", "text");
				attr_dev(input2, "id", "lastName");
				input2.required = true;
				attr_dev(input2, "class", "form-input svelte-wq693c");
				add_location(input2, file, 263, 20, 9203);
				add_location(div2, file, 261, 16, 9070);
				attr_dev(label3, "for", "birthday");
				attr_dev(label3, "class", "block text-sm font-medium text-gray-700");
				add_location(label3, file, 266, 20, 9352);
				attr_dev(input3, "type", "date");
				attr_dev(input3, "id", "birthday");
				input3.required = true;
				attr_dev(input3, "class", "form-input svelte-wq693c");
				add_location(input3, file, 267, 20, 9470);
				add_location(div3, file, 265, 16, 9326);
				attr_dev(label4, "for", "status");
				attr_dev(label4, "class", "block text-sm font-medium text-gray-700");
				add_location(label4, file, 270, 20, 9619);
				option0.__value = "activo";
				set_input_value(option0, option0.__value);
				add_location(option0, file, 272, 24, 9815);
				option1.__value = "en_deuda";
				set_input_value(option1, option1.__value);
				add_location(option1, file, 273, 24, 9878);
				option2.__value = "inactivo";
				set_input_value(option2, option2.__value);
				add_location(option2, file, 274, 24, 9945);
				attr_dev(select, "id", "status");
				select.required = true;
				attr_dev(select, "class", "form-input svelte-wq693c");
				if (/*status*/ ctx[5] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[33].call(select));
				add_location(select, file, 271, 20, 9722);
				add_location(div4, file, 269, 16, 9593);
				attr_dev(div5, "class", "grid grid-cols-1 md:grid-cols-2 gap-4");
				add_location(div5, file, 252, 12, 8480);
				attr_dev(input4, "type", "checkbox");
				attr_dev(input4, "class", "mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded");
				add_location(input4, file, 282, 20, 10276);
				attr_dev(label5, "class", "flex items-center text-lg font-semibold text-gray-700 mb-2");
				add_location(label5, file, 281, 16, 10181);
				attr_dev(div6, "class", "border-t border-gray-200 pt-4 mt-4");
				add_location(div6, file, 280, 12, 10116);
				attr_dev(input5, "type", "checkbox");
				attr_dev(input5, "class", "mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded");
				add_location(input5, file, 315, 20, 12370);
				attr_dev(label6, "class", "flex items-center text-lg font-semibold text-gray-700 mb-2");
				add_location(label6, file, 314, 16, 12275);
				attr_dev(div7, "class", "border-t border-gray-200 pt-4 mt-4");
				add_location(div7, file, 313, 12, 12210);
				attr_dev(input6, "type", "checkbox");
				attr_dev(input6, "class", "mr-2 h-4 w-4 text-indigo-600 border-gray-300 rounded");
				add_location(input6, file, 348, 20, 14463);
				attr_dev(label7, "class", "flex items-center text-lg font-semibold text-gray-700 mb-2");
				add_location(label7, file, 347, 16, 14368);
				attr_dev(div8, "class", "border-t border-gray-200 pt-4 mt-4");
				add_location(div8, file, 346, 12, 14303);
				attr_dev(button, "type", "submit");
				attr_dev(button, "class", "btn-primary flex-1 svelte-wq693c");
				add_location(button, file, 380, 16, 16430);
				attr_dev(div9, "class", "flex space-x-4 mt-6");
				add_location(div9, file, 379, 12, 16380);
				attr_dev(form, "class", "space-y-4");
				add_location(form, file, 250, 8, 8365);
				attr_dev(div10, "class", "mb-8 p-6 border border-gray-200 rounded-lg shadow-sm");
				add_location(div10, file, 248, 4, 8211);
				attr_dev(h21, "class", "text-2xl font-semibold text-gray-700 mb-4");
				add_location(h21, file, 391, 12, 16892);
				attr_dev(th0, "class", "table-header svelte-wq693c");
				add_location(th0, file, 396, 28, 17184);
				attr_dev(th1, "class", "table-header svelte-wq693c");
				add_location(th1, file, 397, 28, 17260);
				attr_dev(th2, "class", "table-header svelte-wq693c");
				add_location(th2, file, 398, 28, 17334);
				attr_dev(th3, "class", "table-header svelte-wq693c");
				add_location(th3, file, 399, 28, 17409);
				attr_dev(th4, "class", "table-header svelte-wq693c");
				add_location(th4, file, 400, 28, 17474);
				attr_dev(th5, "class", "table-header svelte-wq693c");
				add_location(th5, file, 401, 28, 17545);
				attr_dev(th6, "class", "table-header svelte-wq693c");
				add_location(th6, file, 402, 28, 17616);
				attr_dev(th7, "class", "table-header svelte-wq693c");
				add_location(th7, file, 403, 28, 17686);
				add_location(tr, file, 395, 24, 17151);
				attr_dev(thead, "class", "bg-gray-50");
				add_location(thead, file, 394, 20, 17100);
				attr_dev(tbody, "class", "bg-white divide-y divide-gray-200");
				add_location(tbody, file, 406, 20, 17804);
				attr_dev(table, "class", "min-w-full divide-y divide-gray-200");
				add_location(table, file, 393, 16, 17028);
				attr_dev(div11, "class", "overflow-x-auto");
				add_location(div11, file, 392, 12, 16982);
				attr_dev(div12, "class", "p-6");
				add_location(div12, file, 390, 8, 16862);
				attr_dev(div13, "class", "bg-white overflow-hidden shadow-sm sm:rounded-lg");
				add_location(div13, file, 389, 4, 16791);
				attr_dev(div14, "class", "container svelte-wq693c");
				add_location(div14, file, 244, 0, 7997);
			},
			l: function claim(nodes) {
				throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},
			m: function mount(target, anchor) {
				insert_dev(target, div14, anchor);
				append_dev(div14, h1);
				append_dev(div14, t1);
				append_dev(div14, div10);
				append_dev(div10, h20);
				append_dev(h20, t2);
				append_dev(div10, t3);
				append_dev(div10, form);
				append_dev(form, div5);
				append_dev(div5, div0);
				append_dev(div0, label0);
				append_dev(div0, t5);
				append_dev(div0, input0);
				set_input_value(input0, /*idNumber*/ ctx[1]);
				append_dev(div5, t6);
				append_dev(div5, div1);
				append_dev(div1, label1);
				append_dev(div1, t8);
				append_dev(div1, input1);
				set_input_value(input1, /*firstName*/ ctx[2]);
				append_dev(div5, t9);
				append_dev(div5, div2);
				append_dev(div2, label2);
				append_dev(div2, t11);
				append_dev(div2, input2);
				set_input_value(input2, /*lastName*/ ctx[3]);
				append_dev(div5, t12);
				append_dev(div5, div3);
				append_dev(div3, label3);
				append_dev(div3, t14);
				append_dev(div3, input3);
				set_input_value(input3, /*birthday*/ ctx[4]);
				append_dev(div5, t15);
				append_dev(div5, div4);
				append_dev(div4, label4);
				append_dev(div4, t17);
				append_dev(div4, select);
				append_dev(select, option0);
				append_dev(select, option1);
				append_dev(select, option2);
				select_option(select, /*status*/ ctx[5], true);
				append_dev(form, t21);
				append_dev(form, div6);
				append_dev(div6, label5);
				append_dev(label5, input4);
				input4.checked = /*hasKendo*/ ctx[6];
				append_dev(label5, t22);
				append_dev(div6, t23);
				if (if_block0) if_block0.m(div6, null);
				append_dev(form, t24);
				append_dev(form, div7);
				append_dev(div7, label6);
				append_dev(label6, input5);
				input5.checked = /*hasIaido*/ ctx[11];
				append_dev(label6, t25);
				append_dev(div7, t26);
				if (if_block1) if_block1.m(div7, null);
				append_dev(form, t27);
				append_dev(form, div8);
				append_dev(div8, label7);
				append_dev(label7, input6);
				input6.checked = /*hasJodo*/ ctx[16];
				append_dev(label7, t28);
				append_dev(div8, t29);
				if (if_block2) if_block2.m(div8, null);
				append_dev(form, t30);
				append_dev(form, div9);
				append_dev(div9, button);
				append_dev(button, t31);
				append_dev(div9, t32);
				if (if_block3) if_block3.m(div9, null);
				append_dev(div14, t33);
				append_dev(div14, div13);
				append_dev(div13, div12);
				append_dev(div12, h21);
				append_dev(div12, t35);
				append_dev(div12, div11);
				append_dev(div11, table);
				append_dev(table, thead);
				append_dev(thead, tr);
				append_dev(tr, th0);
				append_dev(tr, t37);
				append_dev(tr, th1);
				append_dev(tr, t39);
				append_dev(tr, th2);
				append_dev(tr, t41);
				append_dev(tr, th3);
				append_dev(tr, t43);
				append_dev(tr, th4);
				append_dev(tr, t45);
				append_dev(tr, th5);
				append_dev(tr, t47);
				append_dev(tr, th6);
				append_dev(tr, t49);
				append_dev(tr, th7);
				append_dev(table, t51);
				append_dev(table, tbody);

				for (let i = 0; i < each_blocks.length; i += 1) {
					if (each_blocks[i]) {
						each_blocks[i].m(tbody, null);
					}
				}

				if (each_1_else) {
					each_1_else.m(tbody, null);
				}

				if (!mounted) {
					dispose = [
						listen_dev(input0, "input", /*input0_input_handler*/ ctx[29]),
						listen_dev(input1, "input", /*input1_input_handler*/ ctx[30]),
						listen_dev(input2, "input", /*input2_input_handler*/ ctx[31]),
						listen_dev(input3, "input", /*input3_input_handler*/ ctx[32]),
						listen_dev(select, "change", /*select_change_handler*/ ctx[33]),
						listen_dev(input4, "change", /*input4_change_handler*/ ctx[34]),
						listen_dev(input5, "change", /*input5_change_handler*/ ctx[39]),
						listen_dev(input6, "change", /*input6_change_handler*/ ctx[44]),
						listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[25]), false, true, false, false)
					];

					mounted = true;
				}
			},
			p: function update(ctx, dirty) {
				if (dirty[0] & /*formTitle*/ 2097152) set_data_dev(t2, /*formTitle*/ ctx[21]);

				if (dirty[0] & /*idNumber*/ 2 && input0.value !== /*idNumber*/ ctx[1]) {
					set_input_value(input0, /*idNumber*/ ctx[1]);
				}

				if (dirty[0] & /*firstName*/ 4 && input1.value !== /*firstName*/ ctx[2]) {
					set_input_value(input1, /*firstName*/ ctx[2]);
				}

				if (dirty[0] & /*lastName*/ 8 && input2.value !== /*lastName*/ ctx[3]) {
					set_input_value(input2, /*lastName*/ ctx[3]);
				}

				if (dirty[0] & /*birthday*/ 16) {
					set_input_value(input3, /*birthday*/ ctx[4]);
				}

				if (dirty[0] & /*status*/ 32) {
					select_option(select, /*status*/ ctx[5]);
				}

				if (dirty[0] & /*hasKendo*/ 64) {
					input4.checked = /*hasKendo*/ ctx[6];
				}

				if (/*hasKendo*/ ctx[6]) {
					if (if_block0) {
						if_block0.p(ctx, dirty);
					} else {
						if_block0 = create_if_block_6(ctx);
						if_block0.c();
						if_block0.m(div6, null);
					}
				} else if (if_block0) {
					if_block0.d(1);
					if_block0 = null;
				}

				if (dirty[0] & /*hasIaido*/ 2048) {
					input5.checked = /*hasIaido*/ ctx[11];
				}

				if (/*hasIaido*/ ctx[11]) {
					if (if_block1) {
						if_block1.p(ctx, dirty);
					} else {
						if_block1 = create_if_block_5(ctx);
						if_block1.c();
						if_block1.m(div7, null);
					}
				} else if (if_block1) {
					if_block1.d(1);
					if_block1 = null;
				}

				if (dirty[0] & /*hasJodo*/ 65536) {
					input6.checked = /*hasJodo*/ ctx[16];
				}

				if (/*hasJodo*/ ctx[16]) {
					if (if_block2) {
						if_block2.p(ctx, dirty);
					} else {
						if_block2 = create_if_block_4(ctx);
						if_block2.c();
						if_block2.m(div8, null);
					}
				} else if (if_block2) {
					if_block2.d(1);
					if_block2 = null;
				}

				if (dirty[0] & /*submitButtonText*/ 4194304) set_data_dev(t31, /*submitButtonText*/ ctx[22]);

				if (/*showCancelEdit*/ ctx[23]) {
					if (if_block3) {
						if_block3.p(ctx, dirty);
					} else {
						if_block3 = create_if_block_3(ctx);
						if_block3.c();
						if_block3.m(div9, null);
					}
				} else if (if_block3) {
					if_block3.d(1);
					if_block3 = null;
				}

				if (dirty[0] & /*deleteAssociate, associates, editAssociate*/ 201326593) {
					each_value = ensure_array_like_dev(/*associates*/ ctx[0]);
					validate_each_keys(ctx, each_value, get_each_context, get_key);
					each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, tbody, destroy_block, create_each_block, null, get_each_context);

					if (!each_value.length && each_1_else) {
						each_1_else.p(ctx, dirty);
					} else if (!each_value.length) {
						each_1_else = create_else_block_3(ctx);
						each_1_else.c();
						each_1_else.m(tbody, null);
					} else if (each_1_else) {
						each_1_else.d(1);
						each_1_else = null;
					}
				}
			},
			i: noop,
			o: noop,
			d: function destroy(detaching) {
				if (detaching) {
					detach_dev(div14);
				}

				if (if_block0) if_block0.d();
				if (if_block1) if_block1.d();
				if (if_block2) if_block2.d();
				if (if_block3) if_block3.d();

				for (let i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].d();
				}

				if (each_1_else) each_1_else.d();
				mounted = false;
				run_all(dispose);
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

	const API_BASE_URL = '/api/associates';

	// Helper to format date for display
	function formatDate(dateString) {
		if (!dateString) return '';
		const [year, month, day] = dateString.split('-');
		return `${month}/${day}/${year}`;
	}

	// Function to safely format status
	function formatStatus(statusString) {
		if (typeof statusString === 'string' && statusString) {
			return statusString.replace('_', ' ');
		}

		return 'N/A';
	}

	function instance($$self, $$props, $$invalidate) {
		let { $$slots: slots = {}, $$scope } = $$props;
		validate_slots('App', slots, []);
		let associates = [];
		let associateId = null;

		// Associate form fields
		let idNumber = '';

		let firstName = '';
		let lastName = '';
		let birthday = '';
		let status = 'activo';

		// Activity flags and fields
		let hasKendo = false;

		let kendoLastExam = '';
		let kendoExamDate = '';
		let kendoExamCity = '';
		let kendoExamEmissor = '';
		let hasIaido = false;
		let iaidoLastExam = '';
		let iaidoExamDate = '';
		let iaidoExamCity = '';
		let iaidoExamEmissor = '';
		let hasJodo = false;
		let jodoLastExam = '';
		let jodoExamDate = '';
		let jodoExamCity = '';
		let jodoExamEmissor = '';

		// Form UI state
		let formTitle = 'Registrar Nuevo Asociado';

		let submitButtonText = 'Registrar Asociado';
		let showCancelEdit = false;

		// Array of valid exam levels for the dropdown
		const examLevels = [
			"3er Kyu",
			"2do Kyu",
			"1er Kyu",
			"1er Dan",
			"2do Dan",
			"3er Dan",
			"4to Dan",
			"5to Dan",
			"6to Dan",
			"7mo Dan",
			"8vo Dan"
		];

		// Function to fetch and display associates
		async function fetchAssociates() {
			console.log("Intentando obtener asociados...");

			try {
				const response = await fetch(API_BASE_URL);

				if (!response.ok) {
					throw new Error(`Error HTTP! estado: ${response.status}`);
				}

				const data = await response.json();
				$$invalidate(0, associates = [...data]);
				console.log("Datos de asociados obtenidos:", associates);
			} catch(error) {
				console.error('Error al obtener asociados:', error);
				alert('Fallo al cargar asociados. Ver consola para detalles.');
			}
		}

		// Function to handle form submission (Add/Update)
		async function handleSubmit() {
			const kendoRecord = hasKendo
			? {
					lastExam: kendoLastExam,
					examDate: kendoExamDate,
					examCity: kendoExamCity,
					examEmissor: kendoExamEmissor
				}
			: null;

			const iaidoRecord = hasIaido
			? {
					lastExam: iaidoLastExam,
					examDate: iaidoExamDate,
					examCity: iaidoExamCity,
					examEmissor: iaidoExamEmissor
				}
			: null;

			const jodoRecord = hasJodo
			? {
					lastExam: jodoLastExam,
					examDate: jodoExamDate,
					examCity: jodoExamCity,
					examEmissor: jodoExamEmissor
				}
			: null;

			const associateData = {
				idNumber,
				firstName,
				lastName,
				birthday,
				status,
				kendo: kendoRecord,
				iaido: iaidoRecord,
				jodo: jodoRecord
			};

			try {
				console.log("Enviando datos del asociado:", associateData);
				let response;

				if (associateId) {
					response = await fetch(`${API_BASE_URL}/${associateId}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(associateData)
					});
				} else {
					response = await fetch(API_BASE_URL, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(associateData)
					});
				}

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${errorData.error || 'Error desconocido'}`);
				}

				resetForm();
				await fetchAssociates();
				console.log("Array de asociados después de guardar y obtener:", associates);
			} catch(error) {
				console.error('Error al guardar asociado:', error);
				alert(`Fallo al guardar asociado: ${error.message}. Por favor, verifica tus datos.`);
			}
		}

		// Function to populate form for editing
		async function editAssociate(id) {
			try {
				const response = await fetch(`${API_BASE_URL}/${id}`);

				if (!response.ok) {
					throw new Error(`Error HTTP! estado: ${response.status}`);
				}

				const associate = await response.json();
				associateId = associate.ID;
				$$invalidate(1, idNumber = associate.idNumber);
				$$invalidate(2, firstName = associate.firstName);
				$$invalidate(3, lastName = associate.lastName);
				$$invalidate(4, birthday = associate.birthday);
				$$invalidate(5, status = associate.status);
				$$invalidate(6, hasKendo = !!associate.kendo);
				$$invalidate(7, kendoLastExam = associate.kendo?.lastExam || '');
				$$invalidate(8, kendoExamDate = associate.kendo?.examDate || '');
				$$invalidate(9, kendoExamCity = associate.kendo?.examCity || '');
				$$invalidate(10, kendoExamEmissor = associate.kendo?.examEmissor || '');
				$$invalidate(11, hasIaido = !!associate.iaido);
				$$invalidate(12, iaidoLastExam = associate.iaido?.lastExam || '');
				$$invalidate(13, iaidoExamDate = associate.iaido?.examDate || '');
				$$invalidate(14, iaidoExamCity = associate.iaido?.examCity || '');
				$$invalidate(15, iaidoExamEmissor = associate.iaido?.examEmissor || '');
				$$invalidate(16, hasJodo = !!associate.jodo);
				$$invalidate(17, jodoLastExam = associate.jodo?.lastExam || '');
				$$invalidate(18, jodoExamDate = associate.jodo?.examDate || '');
				$$invalidate(19, jodoExamCity = associate.jodo?.examCity || '');
				$$invalidate(20, jodoExamEmissor = associate.jodo?.examEmissor || '');
				$$invalidate(21, formTitle = 'Editar Asociado');
				$$invalidate(22, submitButtonText = 'Actualizar Asociado');
				$$invalidate(23, showCancelEdit = true);
			} catch(error) {
				console.error('Error al obtener asociado para editar:', error);
				alert('Fallo al cargar asociado para editar. Ver consola para detalles.');
			}
		}

		// Function to delete an associate
		async function deleteAssociate(id) {
			if (!confirm('¿Estás seguro de que quieres eliminar a este asociado?')) {
				return;
			}

			try {
				const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' });

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(`Error HTTP! estado: ${response.status}, mensaje: ${errorData.error || 'Error desconocido'}`);
				}

				await fetchAssociates();
			} catch(error) {
				console.error('Error al eliminar asociado:', error);
				alert(`Fallo al eliminar asociado: ${error.message}.`);
			}
		}

		// Function to reset the form
		function resetForm() {
			associateId = null;
			$$invalidate(1, idNumber = '');
			$$invalidate(2, firstName = '');
			$$invalidate(3, lastName = '');
			$$invalidate(4, birthday = '');
			$$invalidate(5, status = 'activo');
			$$invalidate(6, hasKendo = false);
			$$invalidate(7, kendoLastExam = '');
			$$invalidate(8, kendoExamDate = '');
			$$invalidate(9, kendoExamCity = '');
			$$invalidate(10, kendoExamEmissor = '');
			$$invalidate(11, hasIaido = false);
			$$invalidate(12, iaidoLastExam = '');
			$$invalidate(13, iaidoExamDate = '');
			$$invalidate(14, iaidoExamCity = '');
			$$invalidate(15, iaidoExamEmissor = '');
			$$invalidate(16, hasJodo = false);
			$$invalidate(17, jodoLastExam = '');
			$$invalidate(18, jodoExamDate = '');
			$$invalidate(19, jodoExamCity = '');
			$$invalidate(20, jodoExamEmissor = '');
			$$invalidate(21, formTitle = 'Registrar Nuevo Asociado');
			$$invalidate(22, submitButtonText = 'Registrar Asociado');
			$$invalidate(23, showCancelEdit = false);
		}

		// Initial fetch of associates when the component mounts
		onMount(() => {
			fetchAssociates();
		});

		const writable_props = [];

		Object.keys($$props).forEach(key => {
			if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
		});

		function input0_input_handler() {
			idNumber = this.value;
			$$invalidate(1, idNumber);
		}

		function input1_input_handler() {
			firstName = this.value;
			$$invalidate(2, firstName);
		}

		function input2_input_handler() {
			lastName = this.value;
			$$invalidate(3, lastName);
		}

		function input3_input_handler() {
			birthday = this.value;
			$$invalidate(4, birthday);
		}

		function select_change_handler() {
			status = select_value(this);
			$$invalidate(5, status);
		}

		function input4_change_handler() {
			hasKendo = this.checked;
			$$invalidate(6, hasKendo);
		}

		function select_change_handler_1() {
			kendoLastExam = select_value(this);
			$$invalidate(7, kendoLastExam);
			$$invalidate(24, examLevels);
		}

		function input0_input_handler_1() {
			kendoExamDate = this.value;
			$$invalidate(8, kendoExamDate);
		}

		function input1_input_handler_1() {
			kendoExamCity = this.value;
			$$invalidate(9, kendoExamCity);
		}

		function input2_input_handler_1() {
			kendoExamEmissor = this.value;
			$$invalidate(10, kendoExamEmissor);
		}

		function input5_change_handler() {
			hasIaido = this.checked;
			$$invalidate(11, hasIaido);
		}

		function select_change_handler_2() {
			iaidoLastExam = select_value(this);
			$$invalidate(12, iaidoLastExam);
			$$invalidate(24, examLevels);
		}

		function input0_input_handler_2() {
			iaidoExamDate = this.value;
			$$invalidate(13, iaidoExamDate);
		}

		function input1_input_handler_2() {
			iaidoExamCity = this.value;
			$$invalidate(14, iaidoExamCity);
		}

		function input2_input_handler_2() {
			iaidoExamEmissor = this.value;
			$$invalidate(15, iaidoExamEmissor);
		}

		function input6_change_handler() {
			hasJodo = this.checked;
			$$invalidate(16, hasJodo);
		}

		function select_change_handler_3() {
			jodoLastExam = select_value(this);
			$$invalidate(17, jodoLastExam);
			$$invalidate(24, examLevels);
		}

		function input0_input_handler_3() {
			jodoExamDate = this.value;
			$$invalidate(18, jodoExamDate);
		}

		function input1_input_handler_3() {
			jodoExamCity = this.value;
			$$invalidate(19, jodoExamCity);
		}

		function input2_input_handler_3() {
			jodoExamEmissor = this.value;
			$$invalidate(20, jodoExamEmissor);
		}

		const click_handler = associate => editAssociate(associate.ID);
		const click_handler_1 = associate => deleteAssociate(associate.ID);

		$$self.$capture_state = () => ({
			onMount,
			API_BASE_URL,
			associates,
			associateId,
			idNumber,
			firstName,
			lastName,
			birthday,
			status,
			hasKendo,
			kendoLastExam,
			kendoExamDate,
			kendoExamCity,
			kendoExamEmissor,
			hasIaido,
			iaidoLastExam,
			iaidoExamDate,
			iaidoExamCity,
			iaidoExamEmissor,
			hasJodo,
			jodoLastExam,
			jodoExamDate,
			jodoExamCity,
			jodoExamEmissor,
			formTitle,
			submitButtonText,
			showCancelEdit,
			examLevels,
			formatDate,
			formatStatus,
			fetchAssociates,
			handleSubmit,
			editAssociate,
			deleteAssociate,
			resetForm
		});

		$$self.$inject_state = $$props => {
			if ('associates' in $$props) $$invalidate(0, associates = $$props.associates);
			if ('associateId' in $$props) associateId = $$props.associateId;
			if ('idNumber' in $$props) $$invalidate(1, idNumber = $$props.idNumber);
			if ('firstName' in $$props) $$invalidate(2, firstName = $$props.firstName);
			if ('lastName' in $$props) $$invalidate(3, lastName = $$props.lastName);
			if ('birthday' in $$props) $$invalidate(4, birthday = $$props.birthday);
			if ('status' in $$props) $$invalidate(5, status = $$props.status);
			if ('hasKendo' in $$props) $$invalidate(6, hasKendo = $$props.hasKendo);
			if ('kendoLastExam' in $$props) $$invalidate(7, kendoLastExam = $$props.kendoLastExam);
			if ('kendoExamDate' in $$props) $$invalidate(8, kendoExamDate = $$props.kendoExamDate);
			if ('kendoExamCity' in $$props) $$invalidate(9, kendoExamCity = $$props.kendoExamCity);
			if ('kendoExamEmissor' in $$props) $$invalidate(10, kendoExamEmissor = $$props.kendoExamEmissor);
			if ('hasIaido' in $$props) $$invalidate(11, hasIaido = $$props.hasIaido);
			if ('iaidoLastExam' in $$props) $$invalidate(12, iaidoLastExam = $$props.iaidoLastExam);
			if ('iaidoExamDate' in $$props) $$invalidate(13, iaidoExamDate = $$props.iaidoExamDate);
			if ('iaidoExamCity' in $$props) $$invalidate(14, iaidoExamCity = $$props.iaidoExamCity);
			if ('iaidoExamEmissor' in $$props) $$invalidate(15, iaidoExamEmissor = $$props.iaidoExamEmissor);
			if ('hasJodo' in $$props) $$invalidate(16, hasJodo = $$props.hasJodo);
			if ('jodoLastExam' in $$props) $$invalidate(17, jodoLastExam = $$props.jodoLastExam);
			if ('jodoExamDate' in $$props) $$invalidate(18, jodoExamDate = $$props.jodoExamDate);
			if ('jodoExamCity' in $$props) $$invalidate(19, jodoExamCity = $$props.jodoExamCity);
			if ('jodoExamEmissor' in $$props) $$invalidate(20, jodoExamEmissor = $$props.jodoExamEmissor);
			if ('formTitle' in $$props) $$invalidate(21, formTitle = $$props.formTitle);
			if ('submitButtonText' in $$props) $$invalidate(22, submitButtonText = $$props.submitButtonText);
			if ('showCancelEdit' in $$props) $$invalidate(23, showCancelEdit = $$props.showCancelEdit);
		};

		if ($$props && "$$inject" in $$props) {
			$$self.$inject_state($$props.$$inject);
		}

		return [
			associates,
			idNumber,
			firstName,
			lastName,
			birthday,
			status,
			hasKendo,
			kendoLastExam,
			kendoExamDate,
			kendoExamCity,
			kendoExamEmissor,
			hasIaido,
			iaidoLastExam,
			iaidoExamDate,
			iaidoExamCity,
			iaidoExamEmissor,
			hasJodo,
			jodoLastExam,
			jodoExamDate,
			jodoExamCity,
			jodoExamEmissor,
			formTitle,
			submitButtonText,
			showCancelEdit,
			examLevels,
			handleSubmit,
			editAssociate,
			deleteAssociate,
			resetForm,
			input0_input_handler,
			input1_input_handler,
			input2_input_handler,
			input3_input_handler,
			select_change_handler,
			input4_change_handler,
			select_change_handler_1,
			input0_input_handler_1,
			input1_input_handler_1,
			input2_input_handler_1,
			input5_change_handler,
			select_change_handler_2,
			input0_input_handler_2,
			input1_input_handler_2,
			input2_input_handler_2,
			input6_change_handler,
			select_change_handler_3,
			input0_input_handler_3,
			input1_input_handler_3,
			input2_input_handler_3,
			click_handler,
			click_handler_1
		];
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1, -1]);

			dispatch_dev("SvelteRegisterComponent", {
				component: this,
				tagName: "App",
				options,
				id: create_fragment.name
			});
		}
	}

	const app = new App({
		target: document.body, // Mount to the body or a specific element
		props: {
			// You can pass props to your App component here if needed
		}
	});

	return app;

})();
//# sourceMappingURL=bundle.js.map
