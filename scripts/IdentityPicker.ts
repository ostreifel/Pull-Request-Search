import { IdentityRef } from "VSS/WebApi/Contracts";
import { Combo } from "VSS/Controls/Combos";
import { getClient } from "TFS/Core/RestClient";
import { WebApiTeam } from "TFS/Core/Contracts";
import * as Q from "q";

export interface IdentRefWUnique extends IdentityRef {
    uniqueDisplayName: string;
}
/**
 * Control for picking identities.
 * 
 * The actual in product identity picker is not available for extensions
 */
export class IdentityPicker extends Combo {
    private static readonly sortedIdentities: IdentRefWUnique[] = [];
    private static readonly cachedIdentities: { [guid: string]: void } = {};
    private static readonly allPickers: IdentityPicker[] = [];

    constructor() {
        super();
        IdentityPicker.allPickers.push(this);
    }

    public static updatePickers() {
        const source = this.sortedIdentities.map(i => i.uniqueDisplayName);
        for (let picker of this.allPickers) {
            picker.setSource(source);
        }
    }

    private static uniqueDisplay(ident: IdentityRef) {
        if (ident.isContainer) {
            if (ident.displayName.indexOf("]\\") >= 0) {
                return ident.displayName.split("]\\")[1];
            }
            return ident.displayName;
        }
        return `${ident.displayName} <${ident.uniqueName}>`;
    }

    private static insertIdentity(ident: IdentityRef) {
        const uniqueDisplayName = this.uniqueDisplay(ident);
        const arr = this.sortedIdentities;
        if (arr.length === 0) {
            return 0;
        }
        let lowerBound = 0;
        let upperBound = arr.length - 1;
        let curIn = 0;
        while (true) {
            curIn = Math.floor((upperBound + lowerBound) / 2);
            if (arr[curIn].uniqueDisplayName === uniqueDisplayName) {
                return curIn;
            } else if (arr[curIn].uniqueDisplayName < uniqueDisplayName) {
                lowerBound = curIn + 1;
                if (lowerBound > upperBound) {
                    return curIn + 1;
                }
            } else {
                upperBound = curIn - 1;
                if (lowerBound > upperBound) {
                    return curIn;
                }
            }
        }
    }
    public static cacheIdentity(ident: IdentityRef, tentative: boolean = false) {
        const present = ident.id in this.cachedIdentities;
        if (present && tentative) {
            return;
        }
        this.cachedIdentities[ident.id] = void 0;
        let idx = this.insertIdentity(ident);
        this.sortedIdentities.splice(idx, present ? 1 : 0, {...ident, uniqueDisplayName: this.uniqueDisplay(ident)});
    }

    public static cacheAllIdentitiesInTeam(project: { id: string, name: string }, team: WebApiTeam): IPromise<void> {
        this.cacheIdentity(<IdentityRef>{ displayName: `[${project.name}]\\${team.name}`, id: team.id, isContainer: true }, true);
        return getClient().getTeamMembers(project.id, team.id).then(members => {
            members.map(m => this.cacheIdentity(m));
            return void 0;
        });
    }

    public static cacheAllIdentitiesInProject(project: { id: string, name: string }): IPromise<void> {
        return this.cacheAllIdentitiesInProjectImpl(project, 0);
    }
    public static cacheAllIdentitiesInProjectImpl(project: { id: string, name: string }, skip: number) {
        return getClient().getTeams(project.id, 100, skip).then(teams => {
            const promises = teams.map(t => this.cacheAllIdentitiesInTeam(project, t));
            if (teams.length === 100) {
                promises.push(this.cacheAllIdentitiesInProjectImpl(project, skip + 100));
            }
            return Q.all(promises).then(() => void 0);
        });
    }
    public static cacheAllIdentitiesInAllProjects(): IPromise<void> {
        return getClient().getProjects().then(projects =>
            Q.all(projects.map(p => this.cacheAllIdentitiesInProject(p))).then(
                () => void 0
            )
        );
    }

    public selectedIdentityId(): string | null {
        if (this.getSelectedIndex() < 0) {
            return null;
        }
        return IdentityPicker.sortedIdentities[this.getSelectedIndex()].id;
    }

}
