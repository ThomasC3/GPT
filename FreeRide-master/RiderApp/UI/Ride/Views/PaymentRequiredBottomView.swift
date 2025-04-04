//
//  PaymentRequiredBottomView.swift
//  FreeRide
//

import UIKit

protocol PaymentRequiredBottomViewDelegate: AnyObject {
    func addPaymentMethod()
}

class PaymentRequiredBottomView: CardView {

    weak var delegate: PaymentRequiredBottomViewDelegate?
    
    @IBOutlet var titleLabel: Label!
    @IBOutlet var subtitleLabel: Label!
    @IBOutlet private weak var addPaymentButton: Button?
    
    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(180)
        titleLabel.style = .subtitle6blue
        titleLabel.textColor = Theme.Colors.tangerine
        titleLabel.text = "payments_title_payment_required".localize()
        subtitleLabel.style = .subtitle3blue
        subtitleLabel.textColor = Theme.Colors.darkGray
        subtitleLabel.text = "payments_title_info_required".localize()
        addPaymentButton?.style = .primary
        addPaymentButton?.setTitle("payments_add_pm".localize(), for: .normal)
    }
        
    @IBAction private func addPaymentAction() {
        delegate?.addPaymentMethod()
    }
 
}
