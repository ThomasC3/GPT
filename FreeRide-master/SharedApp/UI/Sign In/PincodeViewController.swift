//
//  PincodeViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/7/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

enum PincodeType {
    case passwordReset
    case emailVerification
    case phoneVerification
}

extension Notification.Name {
    static let didVerifyEmail = Notification.Name("didVerifyEmail")
}

class PincodeViewController: FormViewController {

    private lazy var pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        
        switch type {
        case .passwordReset:
            view.style = .emailPincode
        case .emailVerification:
            view.style = .pincodeEmailConfirmation
        case .phoneVerification:
            view.style = .phonePincode
        }
        
        return view
    }()

    private lazy var pincodeField: TextField = {
        let field = TextField()
        
        field.accessibilityIdentifier = "pincodeTextField"
        field.validators = [RequiredValidator()]
        
        switch type {
        case .passwordReset:
            field.configure(name: "Pincode".localize(), placeholder: "Check Email for Pin".localize())
            field.image = #imageLiteral(resourceName: "EmailBadge")
        case .emailVerification:
            field.configure(name: "Pincode".localize(), placeholder: "Check Email for Pin".localize())
            field.image = #imageLiteral(resourceName: "EmailBadge")
        case .phoneVerification:
            field.configure(name: "Pincode".localize(), placeholder: "Check Texts for Pin".localize())
            field.image = #imageLiteral(resourceName: "PhoneBadge")
        }
        field.keyboardType = .numberPad
        return field
    }()

    var pincodeTarget: String!
    var countryCode = "US"
    var completingPhoneVerification = false
    var showResendOption = true
    
    var type: PincodeType = .emailVerification

    override func viewDidLoad() {
        #if RIDER
        if context.dataStore.currentUser()?.isPhoneVerified ?? false {
            leftNavigationStyle = .back
            leftNavigationAction = .pop(true)
        }
        #endif

        fields = [pincodeField]
        
        confirmationButtonTitle = "Verify".localize()
        
        if showResendOption {
            alternateButtonTitle = "Resend code".localize()
        }
        
        super.viewDidLoad()
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(pageView)
        pageView.pinHorizontalEdges(to: formStackView)
    }

    override func handleAlternateAction() {
        
        switch type {
        case .passwordReset:
            ProgressHUD.show()
            let request = ForgotPasswordRequest(email: pincodeTarget)
            context.api.forgotPassword(request) { result in
                ProgressHUD.dismiss()

                switch result {
                case .success(let response):
                    self.presentAlert("Pincode Sent".localize(), message: response.message)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
        case .emailVerification:
            #if RIDER
            ProgressHUD.show()
            context.api.requestEmailVerification(request: nil) { result in
                ProgressHUD.dismiss()
                switch result {
                case .success(let response):
                    self.presentAlert("Pincode Sent".localize(), message: response.message)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
            #else
            assertionFailure("State not expected")
            #endif
        case .phoneVerification:
            ProgressHUD.show()
            let request = PhonePincodeRequest(phone: pincodeTarget, countryCode: countryCode )
            context.api.phonePincode(request) { result in
                ProgressHUD.dismiss()

                switch result {
                case .success(let response):
                    self.presentAlert("Pincode Sent".localize(), message: response.message)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
        }
    }

    override func handleConfirmationAction() {
        guard isValidWithError() else {
            return
        }

        let phoneNumber: String = pincodeTarget
        let pincode: String = pincodeField.trimmedText

        switch type {
        case .passwordReset:
            ProgressHUD.show()
            let request = EmailVerifyRequest(email: pincodeTarget, code: pincodeField.trimmedText)
            context.api.emailVerify(request) { result in
                ProgressHUD.dismiss()
                
                switch result {
                case .success(let response):
                    Defaults.forgotPasswordAccessToken = response.accessToken

                    let vc = ChangePasswordViewController()
                    self.navigationController?.pushViewController(vc, animated: true)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
        case .emailVerification:
            #if RIDER
            MixpanelManager.trackEvent(MixpanelEvents.RIDER_EMAIL_VERIFICATION_SUBMISSION)
            let request = EmailVerificationRequest(email: pincodeTarget, code: pincode)
            context.api.verifyEmail(request: request) { result in
                ProgressHUD.dismiss()
                switch result {
                case .success(_):
                    Notification.post(.didVerifyEmail)
                    MixpanelManager.trackEvent(MixpanelEvents.RIDER_EMAIL_VERIFICATION_SUCCESSFUL)
                    for vc in self.navigationController?.viewControllers ?? [] {
                        if vc is RiderHomeViewController {
                            self.navigationController?.popToViewController(vc, animated: true)
                            return
                        }
                    }
                    
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
            #else
            assertionFailure("State not expected")
            #endif
        case .phoneVerification:
            ProgressHUD.show()
            let request = PhoneVerifyRequest(phone: phoneNumber, countryCode: countryCode, code: pincode)
            context.api.phoneVerify(request) { apiResult in
                ProgressHUD.dismiss()

                var result = apiResult
                #if DEBUG && STAGING
                if CommandLine.arguments.contains("-mockPhoneVerification") || (phoneNumber == "9199999999" && pincode == "91919") {
                    result = .success(PhoneVerifyResponse(phone: phoneNumber, code: pincode, message: ""))
                }
                #endif

                switch result {
                case .success(let response):
                    let isRegistering = self.context.dataStore.currentLocation() == nil

                    let user = self.context.currentUser
                    user.update(with: response)

                    if isRegistering || self.completingPhoneVerification {

                        MixpanelManager.checkPermissionAndIdentifyUser(user)
                        BugsnagManager.checkPermissionAndIdentifyUser(user)
                        
                        #if RIDER

                        GAManager.checkPermissionAndIdentifyUser(user)
                        IntercomManager.checkPermissionAndIdentifyUser(user)
                        let vc = RiderTabBarController()
                        UIApplication.shared.activeWindow?.rootViewController = vc

                        #elseif DRIVER

                        let vc = DriverTabBarController()
                        UIApplication.shared.activeWindow?.rootViewController = vc

                        #endif
                        
                    } else {
                        let confirm = UIAlertAction(title: "Ok", style: .default, handler: { _ in
                            for vc in self.navigationController?.viewControllers ?? [] {
                                if vc is ProfileViewController {
                                    self.navigationController?.popToViewController(vc, animated: true)
                                    return
                                }
                            }
                        })
                        self.navigationController?.presentAlert("Success!".localize(), message: response.message, cancel: nil, confirm: confirm)
                    }
                    MixpanelManager.trackEvent(MixpanelEvents.RIDER_PHONE_NUMBER_CONFIRMED)
                case .failure(let error):
                    self.presentAlert(for: error)
                }
            }
        }
        
    }
}
