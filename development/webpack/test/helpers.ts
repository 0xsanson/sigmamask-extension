import { mock } from 'node:test';
import {
  type Compiler,
  type Chunk,
  type Compilation,
  type WebpackOptionsNormalized,
  sources,
} from 'webpack';

const { SourceMapSource, RawSource } = sources;

type Assets = { [k: string]: any };

export type Combination<T> = {
  [P in keyof T]: T[P] extends readonly (infer U)[] ? U : never;
};

export function generateCases<T extends object>(obj: T): Combination<T>[] {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      return acc.flatMap((cases) =>
        value.map((cas: unknown) => ({ ...cases, [key]: cas })),
      );
    },
    [{} as Combination<T>],
  );
}

export function mockWebpack(
  files: string[],
  contents: (string | Buffer)[],
  maps: (string | null)[],
  devtool: 'source-map' | 'hidden-source-map' | false = 'source-map',
) {
  const assets = files.reduce((acc, name, i) => {
    const source = contents[i];
    const map = maps?.[i];
    const webpackSource = map
      ? new SourceMapSource(source, name, map)
      : new RawSource(source);
    acc[name] = {
      name,
      info: {
        size: webpackSource.size(),
      },
      source: webpackSource,
    };
    return acc;
  }, {} as Record<string, any>);
  let done: () => void;
  const promise = new Promise<void>((resolve) => {
    done = resolve;
  });
  const compilation = {
    get assets() {
      return Object.fromEntries(
        Object.entries(assets).map(([name, asset]) => [name, asset.source]),
      );
    },
    emitAsset: mock.fn((name, source, info) => {
      assets[name] = {
        name,
        info,
        source,
      };
    }),
    options: {
      devtool,
    } as unknown as WebpackOptionsNormalized,
    chunks: new Set([
      {
        files: new Set(Object.keys(assets)),
      } as Chunk,
    ]),
    getAsset: mock.fn((name) => assets[name]),
    updateAsset: mock.fn((name: string, fn: any) => {
      return fn(assets[name].source);
    }),
    deleteAsset: mock.fn((name: string) => {
      delete assets[name];
    }),
    hooks: {
      processAssets: {
        async tapPromise(_: any, fn: (assets: Assets) => Promise<void>) {
          await fn(compilation.assets);
          done();
        },
        tap(_: any, fn: (assets: Assets) => void) {
          fn(compilation.assets);
          done();
        },
      },
    } as any,
  } as unknown as Compilation;
  const compiler = {
    hooks: {
      compilation: {
        tap(_: any, fn: any) {
          fn(compilation);
        },
      },
    },
    webpack: {
      sources: { SourceMapSource, RawSource },
    },
  } as Compiler;

  return { compiler, compilation, promise };
}
