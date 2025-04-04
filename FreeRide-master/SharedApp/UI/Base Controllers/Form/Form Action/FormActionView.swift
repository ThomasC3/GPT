//
//  FormActionView.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/19/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class FormActionView: UIView {

    var actionHandler: (() -> Void)?

    @IBOutlet weak var button: Button?

    var buttonStyle: Button.Style = .tertiaryDark {
        didSet {
            button?.style = buttonStyle
        }
    }

    override func awakeFromNib() {
        super.awakeFromNib()

        updateTheme()
        constrainHeight(48)
    }

    func configure(button: String, buttonStyle: Button.Style? = nil,  accessibilityLabel: String? = nil, action: @escaping () -> Void) {
        self.button?.setTitle(button, for: .normal)
        self.button?.accessibilityLabel = accessibilityLabel
        if let style = buttonStyle {
            self.buttonStyle = style
        }
        actionHandler = action
    }

    func updateTheme() {
        button?.style = buttonStyle
    }

    @IBAction private func buttonAction() {
        actionHandler?()
    }
}
