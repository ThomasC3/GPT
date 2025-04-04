//
//  LegalView.swift
//  Circuit
//
//  Created by Andrew Boryk on 5/5/19.
//  Copyright © 2019 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol LegalDisclaimerViewDelegate: AnyObject {
    func didSelectTerms()
    func didSelectPrivacy()
    func didSelectConduct()
}

class LegalDisclaimerView: UIView {

    enum LegalDisclaimerType {
        case register
        case login

        var title: String {
            switch self {
            case .register:
                return "By signing up, you agree to our".localize()
            case .login:
                return "By logging in, you agree to our".localize()
            }
        }
    }

    @IBOutlet var termsButton: UIButton!
    @IBOutlet var andLabel: UILabel!
    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet var privacyButton: UIButton!
    @IBOutlet var conductButton: UIButton!
    @IBOutlet var andConductLabel: UILabel!
    
    weak var delegate: LegalDisclaimerViewDelegate?

    var type: LegalDisclaimerType = .register {
        didSet {
            update()
        }
    }

    func update() {
        titleLabel.text = type.title
        termsButton.setTitle("terms of use".localize(), for: .normal)
        privacyButton.setTitle("privacy policy".localize(), for: .normal)

        #if RIDER
        andLabel.text = ","
        andConductLabel.isHidden = false
        conductButton.isHidden = false
        andConductLabel.text = "and".localize()
        conductButton.setTitle("code of conduct".localize(), for: .normal)
        #elseif DRIVER
        andLabel.text = "and".localize()
        andConductLabel.isHidden = true
        conductButton.isHidden = true
        #endif
    }

    @IBAction private func termsAction() {
        delegate?.didSelectTerms()
    }

    @IBAction private func privacyAction() {
        delegate?.didSelectPrivacy()
    }
    
    @IBAction private func conductAction() {
        delegate?.didSelectConduct()
    }
    
}
