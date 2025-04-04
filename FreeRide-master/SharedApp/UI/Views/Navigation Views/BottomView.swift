//
//  BottomView.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/25/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol BottomViewDelegate: AnyObject {
    func didPressAlternateButton(in bottomView: BottomView)
    func didPressConfirmationButton(in bottomView: BottomView)
}

class BottomView: UIView {
    
    @IBOutlet weak var stackView: UIStackView!
    @IBOutlet weak var alternateButton: Button!
    @IBOutlet weak var confirmationButton: Button!
    
    weak var delegate: BottomViewDelegate?

    var isAlternateButtonLast = false
    
    var alternateTitle: String? {
        get { return alternateButton.titleLabel?.text }
        set {
            alternateButton.setTitle(newValue, for: .normal)
            alternateButton.isHidden = newValue?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true
        }
    }
    
    var confirmationTitle: String? {
        get { return confirmationButton.titleLabel?.text }
        set { confirmationButton?.setTitle(newValue, for: .normal) }
    }
    
    var confirmationStyle: Button.Style = .primary {
        didSet {
            confirmationButton.style = confirmationStyle
        }
    }
    
    override func awakeFromNib() {
        super.awakeFromNib()
        
        alternateButton.style = .tertiaryDark
        alternateButton.accessibilityIdentifier = "alternateButton"
        
        confirmationButton.style = confirmationStyle
        confirmationButton.accessibilityIdentifier = "confirmationButton"

        if isAlternateButtonLast {
            stackView.removeArrangedSubview(alternateButton)
            stackView.addArrangedSubview(alternateButton)
        }
    }
    
    func disableAlternateButton(for seconds: TimeInterval) {
        alternateButton?.isEnabled = false
        DispatchQueue.main.asyncAfter(deadline: .now() + seconds) {
            self.alternateButton?.isEnabled = true
        }
    }
    
    @IBAction private func alternateAction() {
        delegate?.didPressAlternateButton(in: self)
    }
    
    @IBAction private func confirmationAction() {
        delegate?.didPressConfirmationButton(in: self)
    }
}
