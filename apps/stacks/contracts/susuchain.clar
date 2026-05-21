;; SusuChain - Rotating Savings Circle on Stacks
;; Members contribute STX each round.
;; When all members pay, the creator triggers payout to the next member in rotation.

;; ---- Data Maps ----

(define-map circles
  { circle-id: uint }
  {
    name: (string-ascii 50),
    contribution: uint,
    members: (list 10 principal),
    current-round: uint,
    active: bool
  }
)

(define-map has-paid
  { circle-id: uint, round: uint, member: principal }
  { paid: bool }
)

(define-map round-balance
  { circle-id: uint }
  { balance: uint }
)

(define-data-var circle-count uint u0)

;; ---- Read-only Functions ----

(define-read-only (get-circle (circle-id uint))
  (map-get? circles { circle-id: circle-id })
)

(define-read-only (get-circle-count)
  (var-get circle-count)
)

(define-read-only (has-member-paid (circle-id uint) (round uint) (member principal))
  (default-to
    false
    (get paid (map-get? has-paid { circle-id: circle-id, round: round, member: member }))
  )
)

(define-read-only (is-member (circle-id uint) (user principal))
  (match (map-get? circles { circle-id: circle-id })
    circle (is-some (index-of (get members circle) user))
    false
  )
)

;; ---- Public Functions ----

(define-public (create-circle
  (name (string-ascii 50))
  (contribution uint)
  (members (list 10 principal)))
  (let ((circle-id (var-get circle-count)))
    (asserts! (>= (len members) u2) (err u1))
    (asserts! (> contribution u0) (err u2))
    (asserts! (<= contribution (/ u18446744073709551615 (len members))) (err u3))
    (asserts! (< circle-id u18446744073709551615) (err u4))
    (map-set circles
      { circle-id: circle-id }
      {
        name: name,
        contribution: contribution,
        members: members,
        current-round: u0,
        active: true
      }
    )
    (map-set round-balance { circle-id: circle-id } { balance: u0 })
    (var-set circle-count (+ circle-id u1))
    (print { event: "circle-created", circle-id: circle-id, creator: tx-sender, name: name })
    (ok circle-id)
  )
)

(define-public (contribute (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles { circle-id: circle-id }) (err u10)))
    (round (get current-round circle))
    (amount (get contribution circle))
    (bal (default-to u0 (get balance (map-get? round-balance { circle-id: circle-id }))))
  )
    (asserts! (get active circle) (err u11))
    (asserts! (is-some (index-of (get members circle) tx-sender)) (err u12))
    (asserts! (not (has-member-paid circle-id round tx-sender)) (err u13))
    (asserts! (<= amount (- u18446744073709551615 bal)) (err u14))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set has-paid
      { circle-id: circle-id, round: round, member: tx-sender }
      { paid: true }
    )
    (map-set round-balance
      { circle-id: circle-id }
      { balance: (+ bal amount) }
    )
    (print { event: "contribution-made", circle-id: circle-id, contributor: tx-sender, round: round })
    (ok true)
  )
)

(define-public (trigger-payout (circle-id uint))
  (let (
    (circle (unwrap! (map-get? circles { circle-id: circle-id }) (err u20)))
    (round (get current-round circle))
    (members (get members circle))
    (bal (default-to u0 (get balance (map-get? round-balance { circle-id: circle-id }))))
    (recipient (unwrap! (element-at members (mod round (len members))) (err u21)))
    (creator (unwrap! (element-at members u0) (err u22)))
  )
    (asserts! (get active circle) (err u23))
    (asserts! (is-eq tx-sender creator) (err u24))
    (map-set round-balance { circle-id: circle-id } { balance: u0 })
    (map-set circles
      { circle-id: circle-id }
      (merge circle {
        current-round: (+ round u1),
        active: (< (+ round u1) (len members))
      })
    )
    (try! (as-contract (stx-transfer? bal tx-sender recipient)))
    (print { event: "payout-sent", circle-id: circle-id, recipient: recipient, amount: bal, round: round })
    (ok true)
  )
)
