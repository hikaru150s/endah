import { IMember } from "../interfaces";
import Decimal from "decimal.js";

export class Group {
    private _id: number;
    public members: IMember[];
    private _center: Decimal[];

    get id(): number {
        return this._id;
    }

    get centerVector(): Decimal[] {
        return this._center;
    }

    public constructor(id: number, centerVector: Decimal[], members: IMember[] = []) {
        this._id = id;
        this._center = centerVector;
        this.members = members;
    }
}
