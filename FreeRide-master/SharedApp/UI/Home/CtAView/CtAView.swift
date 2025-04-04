//
//  CtAView.swift
//  FreeRide
//

import UIKit
import Foundation

protocol CtAViewDelegate: AnyObject {
    func didTapOnCtA()
}

class CtAView: CardView {
    
    @IBOutlet private weak var titleLabel: Label!
    @IBOutlet private weak var subtitleLabel: Label!
    @IBOutlet private weak var actionButton: Button?
    
    weak var delegate: CtAViewDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()
        constrainHeight(220)
        backgroundColor = Theme.Colors.backgroundGray
        titleLabel.style = .subtitle6bluegray
        subtitleLabel.style = .subtitle1blue
        subtitleLabel.textColor = Theme.Colors.darkGray
        actionButton?.style = .primary
    }

    func configure(title: String, subtitle: String, buttonText: String) {
        titleLabel.text = title
        subtitleLabel.text = subtitle
        actionButton?.setTitle(buttonText, for: .normal)
    }

    @IBAction private func ctaAction() {
        delegate?.didTapOnCtA()
    }
}
