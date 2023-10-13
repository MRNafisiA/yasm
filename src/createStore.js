const createStore = state => {
    let id = 0;
    const subscribers = new Map();

    return {
        state: { v: state },
        subscribers,
        subscribe: callback => {
            const _id = id++;
            subscribers.set(_id, callback);
            return () => {
                subscribers.delete(_id);
            };
        },
    };
};

export { createStore };
