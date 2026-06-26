/*
    https://github.com/wouterrutgers/fuzzy-search
*/

class Helper {
    static getDescendantProperty(object: any, path: any, list: any[] = []) {
        let firstSegment;
        let remaining;
        let dotIndex;
        let value;
        let index;
        let length;

        if (path) {
            dotIndex = path.indexOf(".");

            if (dotIndex === -1) {
                firstSegment = path;
            } else {
                firstSegment = path.slice(0, dotIndex);
                remaining = path.slice(dotIndex + 1);
            }

            value = object[firstSegment];
            if (value !== null && typeof value !== "undefined") {
                if (! remaining && (typeof value === "string" || typeof value === "number")) {
                    list.push(value);
                } else if (Object.prototype.toString.call(value) === "[object Array]") {
                    for (index = 0, length = value.length; index < length; index++) {
                        Helper.getDescendantProperty(value[index], remaining, list);
                    }
                } else if (remaining) {
                    Helper.getDescendantProperty(value, remaining, list);
                }
            }
        } else {
            list.push(object);
        }

        return list;
    }
}

export class FuzzySearch {
    constructor(private haystack: any[] = [], private keys: string[] = [], private options: any = {}) {
        if (! Array.isArray(keys)) {
            options = keys;
            keys = [];
        }

        this.haystack = haystack;
        this.keys = keys;
        this.options = Object.assign({
            caseSensitive: false,
            sort: false,
        }, options);
    }

    search(query = "") {
        if (query === "") {
            return this.haystack;
        }

        const results = [];

        for (let i = 0; i < this.haystack.length; i++) {
            const item = this.haystack[i];

            if (this.keys.length === 0) {
                const score = FuzzySearch.isMatch(item, query, this.options.caseSensitive);

                if (score) {
                    results.push({ item, score });
                }
            } else {
                for (let y = 0; y < this.keys.length; y++) {
                    const propertyValues = Helper.getDescendantProperty(item, this.keys[y]);

                    let found = false;

                    for (let z = 0; z < propertyValues.length; z++) {
                        const score = FuzzySearch.isMatch(propertyValues[z], query, this.options.caseSensitive);

                        if (score) {
                            found = true;

                            results.push({ item, score });

                            break;
                        }
                    }

                    if (found) {
                        break;
                    }
                }
            }
        }

        if (this.options.sort) {
            results.sort((a, b) => a.score - b.score);
        }

        return results.map(result => result.item);
    }

    static isMatch(item: any, query: any, caseSensitive: any) {
        item = String(item);
        query = String(query);

        if (! caseSensitive) {
            item = item.toLocaleLowerCase();
            query = query.toLocaleLowerCase();
        }

        const indexes = FuzzySearch.nearestIndexesFor(item, query);

        if (! indexes) {
            return false;
        }

        // Exact matches should be first.
        if (item === query) {
            return 1;
        }

        // If we have more than 2 letters, matches close to each other should be first.
        if (indexes.length > 1) {
            return 2 + (indexes[indexes.length - 1] - indexes[0]);
        }

        // Matches closest to the start of the string should be first.
        return 2 + indexes[0];
    }

    static nearestIndexesFor(item: any, query: any) {
        const letters = query.split("");
        let indexes: any[] = [];

        const indexesOfFirstLetter = FuzzySearch.indexesOfFirstLetter(item, query);

        indexesOfFirstLetter.forEach((startingIndex: any, loopingIndex: any) => {
            let index = startingIndex + 1;

            indexes[loopingIndex] = [startingIndex];

            for (let i = 1; i < letters.length; i++) {
                const letter = letters[i];

                index = item.indexOf(letter, index);

                if (index === -1) {
                    indexes[loopingIndex] = false;

                    break;
                }

                indexes[loopingIndex].push(index);

                index++;
            }
        });

        indexes = indexes.filter(letterIndexes => letterIndexes !== false);

        if (! indexes.length) {
            return false;
        }

        return indexes.sort((a, b) => {
            if (a.length === 1) {
                return a[0] - b[0];
            }

            a = a[a.length - 1] - a[0];
            b = b[b.length - 1] - b[0];

            return a - b;
        })[0];
    }

    static indexesOfFirstLetter(item: any, query: any) {
        const match = query[0];

        return item.split("").map((letter: any, index: any) => {
            if (letter !== match) {
                return false;
            }

            return index;
        }).filter((index: any) => index !== false);
    }
}