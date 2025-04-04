//
//  QuoteBottomView.swift
//  FreeRide
//

import UIKit

protocol QuoteBottomViewDelegate: AnyObject {
    func cancelQuote()
    func confirmQuote(paymentInformation: PaymentInformation?)
    func showQuoteInfo()
}

class QuoteBottomView: BottomCardView {

    @IBOutlet var titleLabel: Label!
    @IBOutlet var subtitleLabel: Label!
    @IBOutlet private weak var confirmButton: Button!
    @IBOutlet private weak var cancelButton: Button!
    
    weak var delegate: QuoteBottomViewDelegate?
    
    var paymentInfo: PaymentInformation?
    
    override func awakeFromNib() {
        super.awakeFromNib()

        constrainHeight(330)
        
        titleLabel.style = .subtitle6blue
        titleLabel.textColor = Theme.Colors.seaFoam
        cancelButton.style = .cancel
        confirmButton.style = .primary
        cancelButton.setTitle("general_cancel".localize(), for: .normal)
        confirmButton.setTitle("general_confirm".localize(), for: .normal)
        
        subtitleLabel.isUserInteractionEnabled = true
        subtitleLabel.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(QuoteBottomView.infoLabelTapped)))
    }
    
    func configure(with paymentInformation: PaymentInformation) {
        paymentInfo = paymentInformation
        titleLabel.text = "ride_ride_confirmation".localize()
                        
        guard var quoteInfo = paymentInfo?.getQuoteInfo() else {
            return
        }
        
        quoteInfo += (" " + "quote_more_info".localize() + "\n")
        
        let regularAttrs = [NSAttributedString.Key.font : Theme.Fonts.subtitle3, NSAttributedString.Key.foregroundColor : Theme.Colors.darkGray]
        let attributedString = NSMutableAttributedString(string:quoteInfo, attributes: regularAttrs as [NSAttributedString.Key : Any])
        if let range = quoteInfo.range(of: "More Info".localize()) {
            let startIndex = quoteInfo.distance(from: quoteInfo.startIndex, to: range.lowerBound)
            let attrRange = NSRange(location: startIndex, length: "More Info".localize().count)
            attributedString.addAttributes([NSAttributedString.Key.underlineStyle: NSUnderlineStyle.single.rawValue], range: attrRange)
        }
        
        subtitleLabel.attributedText = attributedString
    }

    @IBAction private func confirmAction() {
        delegate?.confirmQuote(paymentInformation: paymentInfo)
    }
    
    @IBAction private func cancelAction() {
        delegate?.cancelQuote()
    }
    
    @objc func infoLabelTapped(sender:UITapGestureRecognizer) {
        delegate?.showQuoteInfo()
    }
    
}
