//
//  SignInView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol SignInViewDelegate: AnyObject {
    func shouldTransition(to flow: AuthenticationMethod, for variant: AuthenticationMode)
}

class SignInView: UIView {

    enum Flow {
        case email
        case google
        case apple
    }

    @IBOutlet weak var buttonsStackView: UIStackView!
    @IBOutlet private weak var subtitleLabel: Label!
    @IBOutlet private weak var emailButton: Button!
    @IBOutlet private weak var orLabel: Label!
    @IBOutlet private weak var orStackView: UIStackView!
    @IBOutlet private weak var googleButton: Button!
    @IBOutlet private weak var appleButton: Button!

    weak var delegate: SignInViewDelegate?

    var mode: AuthenticationMode = .login {
        didSet {
            updateUI()
        }
    }

    override func draw(_ rect: CGRect) {
        super.draw(rect)

        updateUI()
    }

    private func updateUI() {
        subtitleLabel.style = .subtitle1darkgray
        subtitleLabel.text = mode == .login ? NSLocalizedString("launch_login_to_continue", comment: "") :  NSLocalizedString("launch_signup_with_circuit", comment: "")

        emailButton.style = .email
        emailButton.tintColor = .white
        emailButton.setTitle("Continue with email".localize(), for: .normal)
        emailButton.accessibilityIdentifier = "continueWithEmailButton"

        googleButton.setTitle("Continue with Google".localize(), for: .normal)
        googleButton.style = .google
        googleButton.accessibilityIdentifier = "continueWithGoogleButton"

        appleButton.setTitle("Continue with Apple".localize(), for: .normal)
        appleButton.style = .apple
        appleButton.accessibilityIdentifier = "continueWithAppleButton"

        orLabel.style = .body1darkgray
        orStackView.isHidden = true
    }

    @IBAction private func emailAction() {
        delegate?.shouldTransition(to: .email, for: mode)
    }

    @IBAction private func googleAction() {
        delegate?.shouldTransition(to: .google, for: mode)
    }

    @IBAction private func appleAction() {
        delegate?.shouldTransition(to: .apple, for: mode)
    }

}
