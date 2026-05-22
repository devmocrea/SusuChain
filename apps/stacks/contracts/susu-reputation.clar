;; Susu Member Reputation & Stats Tracking Contract
;; Tracks on-chain participation metrics for members across savings circles.

(define-data-var owner principal tx-sender)
(define-data-var trusted-contract principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.susuchain)

;; ---- Data Maps ----

(define-map member-stats
  { member: principal }
  {
    circles-joined: uint,
    successful-payments: uint,
    late-payments: uint
  }
)

;; ---- Authorization Helpers ----

(define-read-only (is-owner)
  (is-eq tx-sender (var-get owner))
)

(define-read-only (is-trusted-caller)
  (or
    (is-eq contract-caller (var-get trusted-contract))
    (is-eq tx-sender (var-get owner))
  )
)

;; ---- Read-only Functions ----

(define-read-only (get-member-stats (member principal))
  (default-to
    { circles-joined: u0, successful-payments: u0, late-payments: u0 }
    (map-get? member-stats { member: member })
  )
)

(define-read-only (get-reputation-score (member principal))
  (let (
    (stats (get-member-stats member))
    (success (get successful-payments stats))
    (late (get late-payments stats))
    (total (+ success late))
  )
    (if (is-eq total u0)
      u100
      (/ (* success u100) total)
    )
  )
)

;; ---- Public Functions ----

(define-public (record-circle-joined (member principal))
  (let (
    (stats (get-member-stats member))
  )
    (asserts! (is-trusted-caller) (err u403))
    (map-set member-stats
      { member: member }
      (merge stats { circles-joined: (+ (get circles-joined stats) u1) })
    )
    (ok true)
  )
)

(define-public (record-successful-payment (member principal))
  (let (
    (stats (get-member-stats member))
  )
    (asserts! (is-trusted-caller) (err u403))
    (map-set member-stats
      { member: member }
      (merge stats { successful-payments: (+ (get successful-payments stats) u1) })
    )
    (ok true)
  )
)

(define-public (record-late-payment (member principal))
  (let (
    (stats (get-member-stats member))
  )
    (asserts! (is-trusted-caller) (err u403))
    (map-set member-stats
      { member: member }
      (merge stats { late-payments: (+ (get late-payments stats) u1) })
    )
    (ok true)
  )
)
