import {openDB} from "./_snowpack/pkg/idb.js";
class ItemNotFoundError extends Error {
  constructor(message) {
    super(message);
  }
}
export class AppDB {
  constructor() {
    this.DB_NAME = "inventory";
    this.DB_VERSION = 1;
    this.STORE_NAME = "item";
  }
  async _openDB() {
    const db = await openDB(this.DB_NAME, this.DB_VERSION, {
      upgrade(db2, oldVersion, newVersion, transaction) {
        console.log(`DB needs upgrading from V${oldVersion} to V${newVersion}`);
        if (oldVersion === 0)
          upgradeFromV0ToV1();
        else {
          alert(`Unrecognized database Version: ${oldVersion}`);
        }
        function upgradeFromV0ToV1() {
          db2.createObjectStore("item", {keyPath: "name"});
          console.log("Upgraded DB to V1");
        }
      }
    });
    return db;
  }
  async get(itemName) {
    const db = await this._openDB();
    let tx = db.transaction(this.STORE_NAME, "readonly");
    let store = tx.objectStore(this.STORE_NAME);
    let item = store.get(itemName);
    return item;
  }
  async getAll() {
    const db = await this._openDB();
    let tx = db.transaction(this.STORE_NAME, "readonly");
    let store = tx.objectStore(this.STORE_NAME);
    return await store.getAll();
  }
  async update(key, updatedItem) {
    const db = await this._openDB();
    let tx = db.transaction(this.STORE_NAME, "readwrite");
    let store = tx.objectStore(this.STORE_NAME);
    await store.delete(key);
    try {
      await store.add(updatedItem);
    } catch (err) {
      console.log(err);
      console.log(key);
      tx.abort();
    }
  }
  async remove(name) {
    const db = await this._openDB();
    let tx = db.transaction(this.STORE_NAME, "readwrite");
    let store = tx.objectStore(this.STORE_NAME);
    try {
      await store.delete(name);
    } catch (err) {
      console.log(err);
      console.log(name);
      tx.abort();
      throw err;
    }
  }
  async clear() {
    const db = await this._openDB();
    let tx = db.transaction(this.STORE_NAME, "readwrite");
    let store = tx.objectStore(this.STORE_NAME);
    try {
      await store.clear();
    } catch (err) {
      console.log("error clearing item store");
      console.log(err);
      tx.abort();
    }
  }
  async addItem(item) {
    const db = await this._openDB();
    let tx = db.transaction(this.STORE_NAME, "readwrite");
    let store = tx.objectStore(this.STORE_NAME);
    await store.add(item);
  }
}
