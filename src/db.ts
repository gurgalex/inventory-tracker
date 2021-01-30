import {DBSchema, openDB} from "idb";
import {Item} from 'item';

interface InventoryV1 extends DBSchema {
    'item': {
        value: {
            name: string,
            qty: number,
            threshold: number,
            url: string,
        },
        key: string,
    };
}


// Error Customs
class ItemNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
    }
}


export class AppDB {
    DB_NAME = 'inventory';
    DB_VERSION = 1;
    STORE_NAME = 'item';


    /**
     * Handles opening the DB, and setting it up if it isn't created.
     */
    async _openDB() {
        const db = await openDB<InventoryV1>(this.DB_NAME, this.DB_VERSION, {
            // Upgrade or create the Database
            upgrade(db, oldVersion, newVersion, transaction) {
                console.log(`DB needs upgrading from V${oldVersion} to V${newVersion}`);

                if (oldVersion === 0) upgradeFromV0ToV1();
                else {
                    alert(`Unrecognized database Version: ${oldVersion}`)
                }

                function upgradeFromV0ToV1() {
                    db.createObjectStore('item', {keyPath: 'name'});
                    console.log("Upgraded DB to V1");
                }
            }
        })
        return db;
    }

    async get(itemName: string): Promise<Item> {
        const db = await this._openDB();
        let tx = db.transaction(this.STORE_NAME, 'readonly');
        let store = tx.objectStore(this.STORE_NAME);
        let item = store.get(itemName);
        return item;
    }

    async getAll(): Promise<Item> {
        const db = await this._openDB();
        let tx = db.transaction(this.STORE_NAME, 'readonly');
        let store = tx.objectStore(this.STORE_NAME);
        return await store.getAll();
    }

    /**
     *     Update or insert the stored Item
     */
    async update(key: string, updatedItem: Item) {
        const db = await this._openDB();

        // Start transaction to insert and delete the old record if needed
        let tx = db.transaction(this.STORE_NAME, 'readwrite');
        let store = tx.objectStore(this.STORE_NAME);
        // Todo: Error handling
        await store.delete(key);
        // Todo: Error handling
        try {
            await store.add(updatedItem)
        }
        catch (err) {
            console.log(err);
            console.log(key);
            tx.abort();
        }
    }

    async remove(name: string) {
        const db = await this._openDB();
        let tx = db.transaction(this.STORE_NAME, 'readwrite');
        let store = tx.objectStore(this.STORE_NAME);

        try {
            await store.delete(name);
        }
        catch (err) {
            console.log(err);
            console.log(name);
            tx.abort();
            throw err;
        }

    }

    /** Clears all content from application (item store) **/
    async clear() {
        const db = await this._openDB();
        let tx = db.transaction(this.STORE_NAME, 'readwrite');
        let store = tx.objectStore(this.STORE_NAME);
        try {
            await store.clear();
        }
        catch(err) {
            console.log("error clearing item store");
            console.log(err);
            tx.abort();
        }
    }

    /** Add an Item to the DB */
    async addItem(item: Item) {
        const db = await this._openDB();
        let tx = db.transaction(this.STORE_NAME, 'readwrite');
        let store = tx.objectStore(this.STORE_NAME);
        await store.add(item);
    }
}