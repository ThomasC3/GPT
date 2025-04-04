//
//  LoginViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class LoginViewController: MultiFormViewController, AuthCompletionHandler {

    private let pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        view.style = .login
        return view
    }()

    private let emailField: TextField = {
        let field = TextField()
        field.configure(name: "Email".localize(), placeholder: "Email".localize())
        field.accessibilityIdentifier = "emailTextField"
        field.validators = [RequiredValidator(), EmailValidator()]
        field.image = #imageLiteral(resourceName: "EmailBadge")
        field.keyboardType = .emailAddress
        return field
    }()

    private let passwordField: TextField = {
        let field = TextField()
        field.configure(name: "Password".localize(), placeholder: "Password".localize())
        field.accessibilityIdentifier = "passwordTextField"
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "LockBadge")
        field.isSecureTextEntry = true
        return field
    }()
    
    #if DRIVER
    private let intoxicationCheckBox: CheckBox = {
        let checkBox = CheckBox()
        checkBox.configure(title: "I am not intoxicated")
        checkBox.accessibilityIdentifier = "intoxicationCheckBox"
        return checkBox
    }()

    private let licenceCheckBox: CheckBox = {
        let checkBox = CheckBox()
        checkBox.configure(title: "I have my license/ID")
        checkBox.accessibilityIdentifier = "licenceCheckBox"
        return checkBox
    }()
    
    private let rulesCheckBox: CheckBox = {
        let checkBox = CheckBox()
        checkBox.configure(title: "I am ready and able to complete my work responsibilities and I will follow the rules of the road")
        checkBox.accessibilityIdentifier = "rulesCheckBox"
        return checkBox
    }()
    #endif

    override func viewDidLoad() {
        #if RIDER
        leftNavigationStyle = .back
        leftNavigationAction = .pop(true)
        #endif
        
        fields = [emailField, passwordField]
        #if DRIVER
        checkBoxes = [intoxicationCheckBox, licenceCheckBox, rulesCheckBox]
        #endif


        confirmationButtonTitle = "Sign In".localize()
        alternateButtonTitle = "Forgot Password".localize()

        super.viewDidLoad()

        let legalView: LegalDisclaimerView = .instantiateFromNib()
        legalView.type = .login
        legalView.delegate = self
        bottomView.stackView.addArrangedSubview(legalView)
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(pageView)
        pageView.pinHorizontalEdges(to: formStackView)
    }

    override func handleAlternateAction() {
        let vc = ForgotPasswordViewController()
        navigationController?.pushViewController(vc, animated: true)
        MixpanelManager.trackEvent(MixpanelEvents.RIDER_SIGNIN_FORGOT_PWD)
    }

    override func handleConfirmationAction() {
        guard isValidWithError() else {
            return
        }
        
        #if DRIVER
        if !intoxicationCheckBox.isSelected || !licenceCheckBox.isSelected || !rulesCheckBox.isSelected {
            self.presentAlert("Personal Inspection", message: "You need to complete the personal inspection before you login")
            return
        }
        #endif

        ProgressHUD.show()

        let email = emailField.trimmedText
        let request = LoginRequest(email: email, password: passwordField.trimmedText)
        context.api.login(request) { result in
            ProgressHUD.dismiss()

            switch result {
            case .success(let response):
                let ctx = self.context
                ctx.dataStore.wipeAllUsersExcept(id: response.id)
                let user = ctx.currentUser
                user.update(with: response)
                
                MixpanelManager.checkPermissionAndIdentifyUser(user)
                BugsnagManager.checkPermissionAndIdentifyUser(user)

                #if RIDER
                IntercomManager.checkPermissionAndIdentifyUser(user)
                self.finishRiderAuth(user: user)
                #elseif DRIVER
                if response.isTemporaryPassword {
                    let vc = ChangePasswordViewController()
                    self.navigationController?.pushViewController(vc, animated: true)
                } else {
                    let vc = DriverTabBarController()
                    UIApplication.shared.activeWindow?.rootViewController = vc
                    self.getDriverStatus()
                    if response.isOnline {
                        vc.presentAlert("Sign In", message: "Another device is online with this account.")
                    }
                }
                #endif

                NotificationCoordinator.updateDeviceToken()
                MixpanelManager.trackEvent(MixpanelEvents.RIDER_SIGNIN_SUCCESSFUL)
            case .failure(let error):
                switch error.status {
                case .unprocessableEntity:
                    let request = ForgotPasswordRequest(email: email)
                    self.context.api.forgotPassword(request) { result in
                        switch result {
                        case .success(let response):
                            let vc = PincodeViewController()
                            vc.type = .passwordReset
                            vc.pincodeTarget = response.email
                            vc.leftNavigationStyle = .back
                            vc.leftNavigationAction = .pop(true)

                            self.navigationController?.pushViewController(vc, animated: true)
                            self.presentAlert("Change Password".localize(), message: error.localizedDescription)
                        case .failure:
                            self.presentAlert(for: error)
                        }
                    }
                default:
                    self.presentAlert(for: error)
                }
            }
        }
    }
    
#if DRIVER
    
    func getDriverStatus() {
        let context = DriverAppContext.shared

        guard context.isLoggedIn else {
            return
        }
        
        context.api.getDriverStatus { result in
            switch result {
            case .success(let response):
                //change availability setting
                let currentUser = context.currentUser
                currentUser.update(with: response)
                //update vehicle
                let ds = context.dataStore
                ds.wipeVehicles()
                if let v = response.vehicle {
                    let vehicle = Vehicle(context: context.dataStore.mainContext)
                    vehicle.update(with: v)
                }
                                
                Notification.post(.didUpdateDriverStatus)
            default:
               break
            }
        }
    }
    
#endif
    
}

extension LoginViewController: LegalDisclaimerViewDelegate {
    func didSelectConduct() {
        presentLegal(of: .conduct)
    }

    func didSelectTerms() {
        presentLegal(of: .terms)
    }

    func didSelectPrivacy() {
        presentLegal(of: .privacy)
    }

    private func presentLegal(of type: LegalViewController.LegalType) {
        let vc = LegalViewController()
        vc.type = type

        present(vc, animated: true)
    }
}
