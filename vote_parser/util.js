
class Util {

    async static parallelPromiseLimiter(limit, promiseFactories) {
        return Util._parallelInternal([], 0, limit, promiseFactories)
    }

    async static _parallelInternal(prevResults, curI, limit, promiseFactories) {
        if (curI >= promiseFactories.length) {
            return Promise.resolve(prevResults);
        }
        const nextLimit = curI + limit
        const promiseArr = []
        for (; curI < nextLimit && promiseFactories.length > curI; curI++) {
            promiseArr.push(promiseFactories[curI]())
        }
        return Promise.all(promiseArr).then((results) => {
            return Util._parallelInternal([...prevResults, ...results], curI, promiseFactories);
        })
    }

}

module.exports = Util