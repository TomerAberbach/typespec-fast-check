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

> [!NOTE]
>
> This package doesn't support all TypeSpec features yet. See the
> [open issues](https://github.com/TomerAberbach/typespec-fast-check/issues) for
> what's planned.

## Examples

See [`openai/arbitraries.js`](./test/snapshots/openai/arbitraries.js), which was
generated from the TypeSpec files in Brian Terlson's
[`openai-in-typespec`](https://github.com/bterlson/openai-in-typespec)
repository.

## Contributing

Stars are always welcome!

For bugs and feature requests,
[please create an issue](https://github.com/TomerAberbach/typespec-fast-check/issues/new).

## License

[MIT](https://github.com/TomerAberbach/typespec-fast-check/blob/main/license) ©
[Stainless Software, Inc.](https://www.stainlessapi.com)
