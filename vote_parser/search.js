const cheerio = require('cheerio')
const rq = require('request-promise-native')
const querystring = require('querystring')
// const util = require('./util')


class Search {
    // example url: https://digitallibrary.un.org/search?jrec=21&cc=Voting+Data&ln=en&rg=20&so=a&fct__3=2017&fct__3=2017&fct__2=General+Assembly&fct__2=General+Assembly&fct__9=Vote&sf=latest+first

    constructor() {
        this.rootUrl = "https://digitallibrary.un.org"
        this.searchBaseUrl = this.rootUrl + "/search"
        this.defaultParams = {
            /** language: english */
            ln: 'en',
            /** collection: voting data */
            cc: 'Voting Data',
            /** collection: voting data (again?) */
            c: 'Voting Data',
            /** Only where an actual vote was held, ignore resolutions adopted without vote */
            fct__9: 'Vote',
            /** limit to General Assembly (ignore Security Council) */
            fct__2: 'General Assembly',
            /** year */
            fct__3: 2017,
            /** range/results per site (max=200) */
            rg: 200,
            /** search by: date */
            sf: 'latest+first',
            /** search order: ascending */
            so: 'a',
            /** starting page: 1, 11, 21 etc */
            jrec: 1
        }
        this.maxParallelRequests = 20
    }

    async start(year, offset = 1, prevResults = []) {
        const params = Object.assign({}, this.defaultParams, {
            fct__3: year,
            jrec: offset,
        })
        const url = this.searchBaseUrl + '?' + querystring.stringify(params)
        const $ = await rq({
            uri: url,
            transform: (body) => cheerio.load(body, {
                normalizeWhitespace: true,
            })
        })
        let foundResolutions = $('a.moreinfo')
            .filter((i, a) => 'Detailed record' === $(a).text())
            .map((i, obj) => this.rootUrl + $(obj).attr('href'))
            .toArray()
        foundResolutions = prevResults.concat(foundResolutions)
        if ($('.rec-navigation a img[src$="sn.gif"]').length > 0) {
            return this.start(year, offset + 200, foundResolutions)
        }
        return foundResolutions
    }
}

module.exports = Search