import { produce } from 'immer';
import { YasmContext } from './Provider';
import { useCallback, useContext } from 'react';

const useYasmSetState = (selector, key) => {
    const store = useContext(YasmContext);
    return useCallback(
        produceStateOrState => {
            store.state.v = produce(store.state.v, draft => {
                if (key === undefined) {
                    produceStateOrState(selector(draft));
                } else {
                    if (typeof produceStateOrState === 'function') {
                        const tmp = produceStateOrState(selector(draft)[key]);
                        if (tmp !== undefined) {
                            selector(draft)[key] = tmp;
                        }
                    } else {
                        selector(draft)[key] = produceStateOrState;
                    }
                }
            });
            store.subscribers.forEach(subscriber => {
                subscriber();
            });
        },
        [store, selector, key]
    );
};

export { useYasmSetState };
