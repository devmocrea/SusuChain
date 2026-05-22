;; Susu Emergency Reserve & Liquidity Vault
;; Safeguards savings circles from default by offering temporary payback loans.

(define-data-var owner principal tx-sender)
(define-data-var trusted-contract principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.susuchain)

;; ---- Data Maps ----

(define-map circle-vaults
  { circle-id: uint }
  { balance: uint }
)

(define-map active-loans
  { circle-id: uint }
  {
    amount: uint,
    penalty: uint,
    recipient: principal,
    paid-back: bool
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

(define-read-only (get-vault-balance (circle-id uint))
  (default-to
    u0
    (get balance (map-get? circle-vaults { circle-id: circle-id }))
  )
)

(define-read-only (get-active-loan (circle-id uint))
  (map-get? active-loans { circle-id: circle-id })
)

;; ---- Public Functions ----

(define-public (deposit-to-vault (circle-id uint) (amount uint))
  (let (
    (current-bal (get-vault-balance circle-id))
  )
    (asserts! (> amount u0) (err u1))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (map-set circle-vaults
      { circle-id: circle-id }
      { balance: (+ current-bal amount) }
    )
    (ok true)
  )
)

(define-public (emergency-borrow (circle-id uint) (amount uint) (recipient principal))
  (let (
    (vault-bal (get-vault-balance circle-id))
  )
    (asserts! (is-trusted-caller) (err u403))
    (asserts! (<= amount vault-bal) (err u2))
    (asserts! (is-none (get-active-loan circle-id)) (err u3))
    (map-set circle-vaults
      { circle-id: circle-id }
      { balance: (- vault-bal amount) }
    )
    (map-set active-loans
      { circle-id: circle-id }
      {
        amount: amount,
        penalty: (/ amount u10),
        recipient: recipient,
        paid-back: false
      }
    )
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    (ok true)
  )
)
