
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
