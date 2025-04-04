//
//  ProfileViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class ProfileViewController: FormViewController {

    private let pageView: TitlePageView = {
        let view: TitlePageView = .instantiateFromNib()
        return view
    }()

    private var registeredEmail: String = ""

    private let firstNameField: TextField = {
        let field = TextField()
        field.configure(name: "user_first_name".localize(), placeholder: "user_first_name".localize())
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "UserBadge")
        field.autocorrectionType = .no
        return field
    }()

    private let lastNameField: TextField = {
        let field = TextField()
        field.configure(name: "user_last_name".localize(), placeholder: "user_last_name".localize())
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "UserBadge")
        field.autocorrectionType = .no
        return field
    }()

    private let zipCodeField: TextField = {
        let field = TextField()
        field.configure(name: "user_home_zip_code".localize(), placeholder: "user_home_zip_code".localize())
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "HomeBadge")
        field.keyboardType = .numberPad
        return field
    }()

    private lazy var genderField: TextField = {
        let field = TextField()
        field.configure(name: "user_gender".localize(), placeholder: "user_gender".localize())
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "UserBadge")

        let picker = UIPickerView()
        picker.dataSource = self
        picker.delegate = self
        field.inputView = picker

        return field
    }()

    private lazy var changePasswordActionView: FormActionView = {
        let view: FormActionView = .instantiateFromNib()
        view.configure(button: "user_change_password".localize(), action: {
            self.sendPincodeToEmail()
        })

        return view
    }()

    private lazy var changePhoneActionView: FormActionView = {
        let view: FormActionView = .instantiateFromNib()
        view.configure(button: "user_change_phone".localize(), action: {
            let vc = PhoneVerifyViewController()
            self.navigationController?.pushViewController(vc, animated: true)
        })

        return view
    }()
    
    private lazy var deleteAccountActionView: FormActionView = {
        let view: FormActionView = .instantiateFromNib()
        view.configure(button: "user_delete_account".localize(), action: {
            let confirm = UIAlertAction(title: "general_confirm".localize(), style: .default) { _ in
                self.deleteAccount()
            }
            self.presentAlert("general_are_you_sure".localize(), message: "user_delete_account_description".localize(), cancel: "general_cancel".localize(), confirm: confirm)
        })

        return view
    }()

    override func viewDidLoad() {
        fields = [firstNameField, lastNameField, zipCodeField, genderField]
        actionViews = [changePhoneActionView, changePasswordActionView, deleteAccountActionView]

        confirmationButtonTitle = "general_save".localize()

        leftNavigationStyle = .custom(#imageLiteral(resourceName: "round_menu_black_48pt"))
        leftNavigationAction = .toggleMenu

        title = "user_edit_profile".localize()

        let headerView = UIView(backgroundColor: .clear)
        headerView.constrainHeight(20)
        topView.verticalStackView.addArrangedSubview(headerView)

        super.viewDidLoad()
    }
    
    override public func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        if let user = context.dataStore.currentUser(), user.isSocialAuth {
            actionViews = [changePhoneActionView, deleteAccountActionView]
        }
        else {
            actionViews = [changePhoneActionView, changePasswordActionView, deleteAccountActionView]
        }

        fetchCurrentUserDetails()
    }
    
    func fetchCurrentUserDetails() {
        ProgressHUD.show()
        context.api.getUser() { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                self.context.currentUser.update(with: response)
                self.registeredEmail = response.email
                self.configureProfile(with: response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    func configureProfile(with user: UserResponse) {
        self.pageView.style = .userProfile

        self.firstNameField.text = user.firstName
        self.lastNameField.text = user.lastName
        self.zipCodeField.text = user.zip
        self.genderField.text = TranslationsManager.getGenderOption(user.gender, translationMode: .toLocale)

        let authMethod: String
        if user.google != nil {
            authMethod = "Signed up with Google".localize()
        }
        else if user.apple != nil {
            authMethod = "Signed up with Apple".localize()
        }
        else {
            authMethod = ""
        }

        var userEmail: String = "\("user_email".localize()): \(user.email) "
        if !authMethod.isEmpty {
            userEmail += "(\(authMethod)) "
        }

        // Configure the label with text and the share icon
        let imageAttachment = NSTextAttachment()
        if let symbolImage = UIImage(systemName: "square.and.arrow.up")?.withTintColor(Theme.Colors.seaFoam, renderingMode: .alwaysOriginal) {
            imageAttachment.image = symbolImage
            imageAttachment.bounds = CGRect(x: 0, y: -3, width: symbolImage.size.width, height: symbolImage.size.height)
        }

        let fullString = NSMutableAttributedString(string: userEmail)
        let imageAttributedString = NSAttributedString(attachment: imageAttachment)
        fullString.append(imageAttributedString)

        self.pageView.subtitleLabel.attributedText = fullString
        self.pageView.subtitleLabel.isUserInteractionEnabled = true
        self.pageView.subtitleLabel.removeAllGestures()
        self.pageView.subtitleLabel.addTapRecognizer(target: self, selector: #selector(self.shareEmailAction))
    }

    @objc func shareEmailAction() {
        let emailToShare = registeredEmail
        let itemsToShare = [emailToShare]
        let activityViewController = UIActivityViewController(activityItems: itemsToShare, applicationActivities: nil)
        activityViewController.excludedActivityTypes = [
            .addToReadingList,
            .assignToContact,
            .saveToCameraRoll,
            .print
        ]
        present(activityViewController, animated: true, completion: nil)
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(pageView)
        pageView.pinHorizontalEdges(to: formStackView)
    }

    override func handleConfirmationAction() {
        guard isValidWithError() else {
            return
        }
        
        let request = UpdateUserRequest(
            firstName: firstNameField.trimmedText,
            lastName: lastNameField.trimmedText,
            zip: zipCodeField.trimmedText,
            gender: TranslationsManager.getGenderOption(genderField.trimmedText, translationMode: .toEn), 
            dob: nil
        )

        ProgressHUD.show()
        context.api.updateUser(request) { result in
            ProgressHUD.dismiss()

            switch result {
            case .success(let response):
                let user = self.context.currentUser
                user.update(with: response)

                self.presentAlert("user_updates_saved".localize(), message: "user_updates_saved_info".localize())
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    func sendPincodeToEmail() {
        guard let user = context.dataStore.currentUser() else {
            return
        }
        ProgressHUD.show()
        let request = ForgotPasswordRequest(email: user.email)
        context.api.forgotPassword(request) { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                let vc = PincodeViewController()
                vc.type = .passwordReset
                vc.pincodeTarget = response.email
                self.navigationController?.pushViewController(vc, animated: true)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
    
    private func deleteAccount() {
        guard let user = self.context.dataStore.currentUser() else {
            return
        }
        ProgressHUD.show()
        self.context.api.deleteUser() { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(_):
                self.context.dataStore.wipeLocation()
                self.context.dataStore.wipeRides()
                self.context.socket.disconnect()
                self.context.dataStore.mainContext.delete(user)
                if let location = self.context.dataStore.currentLocation() {
                    self.context.dataStore.mainContext.delete(location)
                }
                self.context.dataStore.save()
                KeychainManager.shared.deleteAccessToken()
                let vc: WalkthroughViewController = .instantiateFromStoryboard()
                let navVC = NavigationController(rootViewController: vc)
                UIApplication.shared.activeWindow?.rootViewController = navVC
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }
}

extension ProfileViewController: UIPickerViewDelegate, UIPickerViewDataSource {

    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }

    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return genderOptions.count
    }

    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return genderOptions[row].localize()
    }

    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        guard row < genderOptions.count else {
            return
        }

        genderField.text = genderOptions[row].localize()
        genderField.toggleErrorState(invalidValidator: nil)
    }
}
