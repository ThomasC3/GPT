//
//  RegisterPageView.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

enum TitlePageViewStyle: Int {
    case registerOne
    case registerTwo
    case registerThree
    case login
    case changePhoneVerify
    case phonePincode
    case emailPincode
    case forgotPassword
    case changePasswordEmailVerify
    case changePassword
    case paymentsNotEnabled
    case emailValidation
    case passwordConfirmation
    case pincodeEmailConfirmation
    case userProfile
    #if DRIVER
    case driverProfile
    #endif
}

class TitlePageView: UIView {

    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var titleLabel: Label!
    @IBOutlet weak var subtitleLabel: Label!
    @IBOutlet private weak var pageControl: UIPageControl!

    var style: TitlePageViewStyle = .registerOne {
        didSet {
            updateUI()
        }
    }

    let defaultNumberOfPages = 3

    var numberOfPages: Int {
        get {
            return pageControl.numberOfPages
        }
        set {
            if newValue > defaultNumberOfPages {
                pageControl.numberOfPages = defaultNumberOfPages
            } else {
                pageControl.numberOfPages = newValue
            }
            updateUI()
        }
    }

    override func awakeFromNib() {
        super.awakeFromNib()
        numberOfPages = defaultNumberOfPages

        applyStyling()
        updateUI()

        let height = (Theme.Fonts.subtitle1?.pointSize ?? 20) * 6
        subtitleLabel.constrainHeight(height)
        layoutSubviews()
    }

    private func applyStyling() {
        titleLabel.style = .title1bluegray
        subtitleLabel.accessibilityIdentifier = "titleLabel"
        subtitleLabel.style = .subtitle1darkgray
        subtitleLabel.accessibilityIdentifier = "subtitleLabel"
        pageControl.pageIndicatorTintColor = Theme.Colors.gray
        pageControl.currentPageIndicatorTintColor = Theme.Colors.seaFoam
    }

    private func updateUI() {
        pageControl.alpha = 0 //default is hidden

        switch style {
        case .login:
            imageView.image = #imageLiteral(resourceName: "round_how_to_reg_black_48pt")
            titleLabel.text = "Welcome Back!".localize()
            subtitleLabel.text = "Sign in below with your account info".localize()
        case .registerOne:
            imageView.image = #imageLiteral(resourceName: "round_how_to_reg_black_48pt")
            titleLabel.text = "Welcome Aboard!".localize()
            subtitleLabel.text = "Start by filling out your basic account info\nMust be 16 or older to create an account".localize()
            pageControl.alpha = 1
            pageControl.currentPage = calculateCurrentPage(for: style)
        case .registerTwo:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "Welcome Aboard!".localize()
            subtitleLabel.text = "Tell us a little bit more about yourself".localize()
            pageControl.alpha = 1
            pageControl.currentPage = calculateCurrentPage(for: style)
        case .registerThree:
            imageView.image = #imageLiteral(resourceName: "baseline_call_black_48pt")
            titleLabel.text = "Welcome Aboard!".localize()
            subtitleLabel.text = "Lastly, let’s verify your mobile phone number so Drivers can reach you".localize()
            pageControl.alpha = 1
            pageControl.currentPage = calculateCurrentPage(for: style)
        case .changePhoneVerify:
            imageView.image = #imageLiteral(resourceName: "baseline_call_black_48pt")
            titleLabel.text = "Change Phone".localize()
            subtitleLabel.text = "First we will send a PIN code to your new mobile phone".localize()
        case .phonePincode:
            imageView.image = #imageLiteral(resourceName: "baseline_call_black_48pt")
            titleLabel.text = "Confirm Phone".localize()
            subtitleLabel.text = "Please check your text messages for a pincode".localize()
        case .emailPincode:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "Confirm Email".localize()
            subtitleLabel.text = "Please check your email inbox for a pincode".localize()
        case .forgotPassword:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "Forgot Password".localize()
            subtitleLabel.text = "First we need to verify your email".localize()
        case .changePasswordEmailVerify:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "Change Password".localize()
            subtitleLabel.text = "First we need to verify your email".localize()
        case .changePassword:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "Change Password".localize()
            subtitleLabel.text = "Please enter your new password".localize()
        case .paymentsNotEnabled:
            imageView.image = #imageLiteral(resourceName: "round_where_to_vote_black_48pt")
            titleLabel.text = "Good news!".localize()
            subtitleLabel.text = "Your location doesn't require payments. Go ahead and ask for a ride. It's free!".localize()
        case .emailValidation:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "email_confirm_email_title".localize()
            subtitleLabel.text = "email_confirm_email_desc".localize()
        case .passwordConfirmation:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "email_confirm_pwd_title".localize()
            subtitleLabel.text = "email_confirm_pwd_desc".localize()
        case .pincodeEmailConfirmation:
            imageView.image = #imageLiteral(resourceName: "round_security_black_48pt")
            titleLabel.text = "email_confirm_pin_title".localize()
            subtitleLabel.text = "email_confirm_pin_desc".localize()
            imageView.tintColor = Theme.Colors.seaFoam
        case .userProfile:
            imageView.isHidden = true
            titleLabel.isHidden = true
            pageControl.isHidden = true
        #if DRIVER
        case .driverProfile:
            imageView.isHidden = true
            titleLabel.isHidden = true
            pageControl.isHidden = true
        #endif
        }
    }

    private func calculateCurrentPage(for style: TitlePageViewStyle) -> Int {
        switch (numberOfPages, style) {
        case (1, _):
            return 0  // Always show as first page if there's only one page
        case (2, .registerTwo):
            return 0  // Show as first page if there are two pages
        case (2, .registerThree):
            return 1  // Show as second page if there are two pages
        case (3, .registerTwo):
            return 1  // Show as second page if there are three pages
        case (3, .registerThree):
            return 2  // Show as third page if there are three pages
        default:
            return 0  // Default to first page
        }
    }
}
