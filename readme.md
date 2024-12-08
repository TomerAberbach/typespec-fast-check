<h1 align="center">
  typespec-fast-check
</h1>

<div align="center">
  <a href="https://npmjs.org/package/typespec-fast-check">
    <img src="https://badgen.net/npm/v/typespec-fast-check" alt="version" />
  </a>
  <a href="https://github.com/TomerAberbach/typespec-fast-check/actions">
    <img src="https://github.com/TomerAberbach/typespec-fast-check/workflows/CI/badge.svg" alt="CI" />
  </a>
  <a href="https://unpkg.com/typespec-fast-check/dist/index.js">
    <img src="https://deno.bundlejs.com/?q=typespec-fast-check&badge" alt="gzip size" />
  </a>
  <a href="https://unpkg.com/typespec-fast-check/dist/index.js">
    <img src="https://deno.bundlejs.com/?q=typespec-fast-check&config={%22compression%22:{%22type%22:%22brotli%22}}&badge" alt="brotli size" />
  </a>
  <a href="https://github.com/sponsors/TomerAberbach">
    <img src="https://img.shields.io/static/v1?label=Sponsor&message=%E2%9D%A4&logo=GitHub&color=%23fe8e86" alt="Sponsor" />
  </a>
</div>

<div align="center">
  A TypeSpec emitter for
  <a href="https://fast-check.dev"><code>fast-check</code></a>
  arbitraries.
</div>

## Install

```sh
$ npm i typespec-fast-check
```

## Usage

Via the command line:

```sh
tsp compile . --emit=typespec-fast-check
```

Via the config:

```yaml
emit:
  - 'typespec-fast-check'
```

See the
[TypeSpec documentation](https://typespec.io/docs/emitters/protobuf/reference/emitter)
for more information.

## Contributing

Stars are always welcome!

For bugs and feature requests,
[please create an issue](https://github.com/TomerAberbach/typespec-fast-check/issues/new).

## License

[MIT](https://github.com/TomerAberbach/typespec-fast-check/blob/main/license) ©
[Stainless Software, Inc.](https://www.stainlessapi.com)
