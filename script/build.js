const argv = require('minimist')(process.argv.slice(2));

const ch = Number(argv.ch);
if (Number.isNaN(ch)) {
	throw new Error('chapter required');
}

const entry = `ch${ch}/index.ts`;
const outfile = `ch${ch}/index.js`;

require('esbuild')
	.build({
		entryPoints: [entry],
		bundle: true,
		sourcemap: true,
		outfile
	})
	.catch(() => process.exit(1));
