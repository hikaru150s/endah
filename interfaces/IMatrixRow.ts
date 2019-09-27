import { Person } from "../classes";
import Decimal from "decimal.js";

export interface IMatrixRow {
    person: Person;
    vector: Decimal[];
}
