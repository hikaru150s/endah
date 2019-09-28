import Decimal from "decimal.js";

export class ClusterCenter {
    private _id: number;
    private _vector: Decimal[];

    get id(): number {
        return this._id;
    }

    get vector(): Decimal[] {
        return this._vector;
    }

    public constructor(id: number, vector: Decimal[] = []) {
        this._id = id;
        this._vector = vector;
    }
}
