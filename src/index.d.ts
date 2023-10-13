import React, { JSX, ReactNode } from 'react';

declare type Store<S> = {
    state: { v: S };
    subscribers: Map<number, () => void>;
    subscribe: (callback: () => void) => () => void;
};
declare type EnterObject<
    Obj,
    Path extends readonly (number | string)[],
    Depth extends number
> = {
    done: Obj;
    recur: EnterObject<
        Obj[Path[[
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20
        ][Depth]] &
            keyof Obj],
        Path,
        [
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20
        ][Depth]
    >;
}[`${Depth}` extends Exclude<keyof Path, keyof never[]> ? 'recur' : 'done'];

declare const createStore: <S>(state: S) => Store<S>;
declare const YasmContext: React.Context<Store<never>>;
declare const YasmProvider: <S>(props: {
    store: Store<S>;
    children?: ReactNode | undefined;
}) => JSX.Element;

declare function useYasmState<RootS, S>(
    selector: (rootState: RootS) => S
): [S, (produceState: (v: S) => void) => void];
declare function useYasmState<RootS, S, K extends keyof S>(
    selector: (rootState: RootS) => S,
    key: K
): [S[K], (produceState: S[K] | ((v: S[K]) => S[K] | void)) => void];

declare function useYasmSetState<RootS, S>(
    selector: (rootState: RootS) => S
): (produceState: (v: S) => void) => void;
declare function useYasmSetState<RootS, S, K extends keyof S>(
    selector: (rootState: RootS) => S,
    key: K
): (produceState: S[K] | ((v: S[K]) => S[K] | void)) => void;
