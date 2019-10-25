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

    get strVector(): string[] {
        return this._vector.map(v => v.toPrecision(7));
    }

    public constructor(id: number, vector: Decimal[] = []) {
        this._id = id;
        this._vector = vector;
    }
}
