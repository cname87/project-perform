// export for convenience.
export { ActivatedRoute } from '@angular/router';

/**
 * An ActivatedRoute test double with a dummy snapshot.
 * A parameter can be set and got.
 * e.g.
 * const route = new ActivatedRouteSnapshotStub(15)
 * this.route.snapshot.paramMap.get('id') returns 15.
 */
export class ActivatedRouteSnapshotStub {
  /* default parameter is 0 */
  constructor(public id = 0) {}

  /* dummy snapshot */
  snapshot = {
    paramMap: {
      get: () => this.id,
    },
  };

  /* set id paramater */
  setId(idNew: number) {
    this.id = idNew;
  }
}