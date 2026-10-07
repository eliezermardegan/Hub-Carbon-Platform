# carbon-core

Deterministic GHG calculation primitives.

AI may extract and classify activity data, but final arithmetic is performed by this package.

Initial formula: `emissions = activity quantity × emission factor`.

Factor identifier and version are retained in every calculation result for provenance. Unit conversion, boundaries, GWP versions and methodology-specific rules remain explicit layers.
