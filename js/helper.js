export('set');

Object.defineProperty(Array.prototype, "max", {
		value: function() {
			return Math.max.apply( Math, this );
		}
});

Object.defineProperty(Array.prototype, "min", {
		value: function() {
			return Math.min.apply( Math, this );
		}
});

Object.defineProperty(Array.prototype, "partition", {
		value: function(fn) {
			var trues = [], falses = [];
			for (var i=0; i<this.length; i++) {
				if (fn(this[i], i)) {
					trues.push(this[i]);
				} else {
					falses.push(this[i]);
				}
			}
			return [trues, falses]
		}
});

Object.defineProperty(Object, "merge", {
	value: function(dest, source, recursive) {
		for (var p in source) {
			try {
				if (recursive && source[p].constructor == Object ) {
					dest[p] = Object.merge(dest[p], source[p], true);
				} else {
					dest[p] = source[p];
				}
			} catch(e) {
				dest[p] = source[p];
			}
		}
		return dest;
	}
});

// if (value in set(1,2,3,4)) 
function set()  {
	var result = {};
	for (var i = 0; i < arguments.length; i++)
		result[arguments[i]] = true;
	return result;
}

Object.defineProperty(Function, "isFunction", {
	value: function(fn) {
		return typeof fn == 'function';
	}		
});

Object.defineProperty(Object, "isObject", {
	value: function(obj) {
		return typeof obj == 'object';
	}		
});

Object.defineProperty(Object, "isArray", {
		value: function(obj) {
			return Object.isObject(obj) && obj.constructor == Array;
		}
});

