//
//  RegisterViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/28/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class RegisterViewController: FormViewController {
    
    struct RegisterForm {
        var firstName: String?
        var lastName: String?
        var email: String?
        var password: String?
        var zipCode: String?
        var gender: String?
        var dob: String?
        var countryCode: String?
        var phone: String?
        var google: String?
        var apple: String?

        static var current = RegisterForm()

        var isSocialAuth: Bool {
            return google != nil || apple != nil
        }

        var dobLocalFormatted: String? {
            guard let dob = dob, let date = BirthdayValidator.serverDateFormatter.date(from: dob) else {
                return nil
            }

            return BirthdayValidator.displayDateFormatter.string(from: date)
        }

        mutating func update(with response: SocialAuthResponse?) {
            firstName = response?.firstName
            lastName = response?.lastName
            email = response?.email
            zipCode = response?.zip
            gender = response?.gender
            dob = response?.dob
            phone = response?.phone
            google = response?.google
            apple = response?.apple
        }

        mutating func reset() {
            firstName = nil
            lastName = nil
            email = nil
            password = nil
            zipCode = nil
            gender = nil
            dob = nil
            countryCode = nil
            phone = nil
            google = nil
        }
    }

    var form: RegisterForm {
        get { return RegisterForm.current }
        set { RegisterForm.current = newValue }
    }

    let pageView: TitlePageView = .instantiateFromNib()

    private let firstNameField: TextField = {
        let field = TextField()
        field.configure(name: "user_first_name".localize(), placeholder: "user_first_name".localize())
        field.accessibilityIdentifier = "firstNameTextField"
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "UserBadge")
        field.autocorrectionType = .no
        return field
    }()

    private let lastNameField: TextField = {
        let field = TextField()
        field.configure(name: "user_last_name".localize(), placeholder: "user_last_name".localize())
        field.accessibilityIdentifier = "lastNameTextField"
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "UserBadge")
        field.autocorrectionType = .no
        return field
    }()

    private let emailField: TextField = {
        let field = TextField()
        field.configure(name: "user_email".localize(), placeholder: "user_email".localize())
        field.accessibilityIdentifier = "emailTextField"
        field.validators = [RequiredValidator(), EmailValidator()]
        field.image = #imageLiteral(resourceName: "EmailBadge")
        field.keyboardType = .emailAddress
        return field
    }()

    private let passwordField: TextField = {
        let field = TextField()
        field.configure(name: "user_password".localize(), placeholder: "user_password".localize())
        field.accessibilityIdentifier = "passwordTextField"
        field.validators = [RequiredValidator(), PasswordValidator()]
        field.image = #imageLiteral(resourceName: "LockBadge")
        field.isSecureTextEntry = true
        #if DEBUG && STAGING
        field.isSecureTextEntry = false
        #endif
        return field
    }()

    private let zipCodeField: TextField = {
        let field = TextField()
        field.configure(name: "user_home_zip_code".localize(), placeholder: "user_home_zip_code".localize())
        field.accessibilityIdentifier = "zipCodeTextField"
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "HomeBadge")
        field.keyboardType = .numberPad
        return field
    }()

    private lazy var genderField: TextField = {
        let field = TextField()
        field.configure(
            name: "user_gender".localize(),
            placeholder: "user_gender".localize() + " (" + "user_optional".localize().lowercased() + ")",
            defaultValue: genderOptions[8].localize() //user_gender_not_state
        )
        field.accessibilityIdentifier = "genderTextField"
        field.validators = []
        field.image = #imageLiteral(resourceName: "UserBadge")

        let picker = UIPickerView()
        picker.dataSource = self
        picker.delegate = self
        picker.tag = 1
        field.inputView = picker

        return field
    }()

    private lazy var countryCodeField: TextField = {
        let field = TextField()
        field.configure(name: "user_country_code".localize(), placeholder: "user_country_code".localize())
        field.accessibilityIdentifier = "countryCodeTextField"
        field.validators = [RequiredValidator()]
        field.image = #imageLiteral(resourceName: "PhoneBadge")

        let picker = UIPickerView()
        picker.dataSource = self
        picker.delegate = self
        picker.tag = 2
        field.inputView = picker

        return field
    }()

    private lazy var dobField: DateTextField = {
        let field = DateTextField()
        field.configure(name: "user_dob".localize(), placeholder: "user_dob".localize())
        field.accessibilityIdentifier = "dateOfBirthTextField"
        field.validators = [RequiredValidator(), BirthdayValidator()]
        field.image = #imageLiteral(resourceName: "UserBadge")
        field.displayFormatter = BirthdayValidator.displayDateFormatter
        field.valueFormatter = BirthdayValidator.serverDateFormatter
        return field
    }()

    private let phoneField: TextField = {
        let field = TextField()
        field.configure(name: "user_mobile_phone".localize(), placeholder: "user_mobile_phone".localize())
        field.accessibilityIdentifier = "phoneNumberTextField"
        field.validators = [RequiredValidator(), PhoneValidator()]
        field.image = #imageLiteral(resourceName: "PhoneBadge")
        field.keyboardType = .numberPad
        return field
    }()

    var style: TitlePageViewStyle {
        get { return pageView.style }
        set { pageView.style = newValue }
    }

    override func viewDidLoad() {
        switch style {
        case .registerOne:
            if form.isSocialAuth {
                fields = [firstNameField, lastNameField, emailField]
            } else {
                fields = [firstNameField, lastNameField, emailField, passwordField]
            }
            confirmationButtonTitle = "user_i_agree".localize()

            leftNavigationStyle = .back
            leftNavigationAction = .custom({
                self.form.update(with: nil)
                self.navigationController?.popViewController(animated: true)
            })
        case .registerTwo:
            fields = [zipCodeField, dobField, genderField]
            confirmationButtonTitle = "general_next".localize()

            leftNavigationStyle = .back
            leftNavigationAction = .pop(true)
        case .registerThree:
            fields = [countryCodeField, phoneField]
            confirmationButtonTitle = "user_signup".localize()

            leftNavigationStyle = .back

            leftNavigationAction = .custom({
                self.form.phone = self.phoneField.trimmedText
                self.navigationController?.popViewController(animated: true)
            })
        default:
            break
        }

        super.viewDidLoad()

        let legalView: LegalDisclaimerView = .instantiateFromNib()
        legalView.type = .register
        legalView.delegate = self
        bottomView.stackView.insertArrangedSubview(legalView, at: 0)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        firstNameField.text = form.firstName
        lastNameField.text = form.lastName
        emailField.text = form.email
        passwordField.text = form.password
        zipCodeField.text = form.zipCode
        genderField.text = form.gender
        dobField.text = form.dobLocalFormatted
        phoneField.text = form.phone
    }

    override func addViewsBeforeFields() {
        formStackView.addArrangedSubview(pageView)
        pageView.pinHorizontalEdges(to: formStackView)
    }

    override func handleConfirmationAction() {
        guard isValidWithError() else {
            return
        }
        
        switch style {
        case .registerOne:
            form.firstName = firstNameField.value
            form.lastName = lastNameField.value
            form.email = emailField.value
            form.password = form.isSocialAuth ? nil : passwordField.value
            transition(to: .registerTwo)
            MixpanelManager.trackEvent(MixpanelEvents.RIDER_SIGNUP_STEP_1)
        case .registerTwo:
            form.zipCode = zipCodeField.value
            form.gender = genderField.value
            form.dob = dobField.value
            transition(to: .registerThree)
            MixpanelManager.trackEvent(MixpanelEvents.RIDER_SIGNUP_STEP_2)
        case .registerThree:
            form.phone = phoneField.value
            form.countryCode = getCountryCode(self.countryCodeField.trimmedText)
            saveUserAccount()
        default:
            break
        }
    }

    func saveUserAccount() {
        let request = RegisterRequest(form: form)
        registerUser(request: request)
    }

    private func registerUser(request: RegisterRequest) {
        guard request.isValidRequest else {
            presentAlert("user_invalid_registration".localize(), message: "user_invalid_registration_info".localize())
            return
        }
        MixpanelManager.trackEvent(MixpanelEvents.RIDER_SIGNUP_STEP_3)

        ProgressHUD.show()
        context.api.register(request) { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                self.handleSuccessfulRegistration(response: response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    func handleSuccessfulRegistration(response: UserResponse) {
        let user = self.context.currentUser
        user.update(with: response)
        self.form.reset()
        NotificationCoordinator.updateDeviceToken()

        MixpanelManager.trackEvent(MixpanelEvents.RIDER_SIGNUP_SUCCESSFUL)

        // Fetch global settings and proceed with the flow
        self.fetchGlobalSettingsAndProceed()
    }

    private func fetchGlobalSettingsAndProceed() {
        ProgressHUD.show()
        self.context.api.getGlobalSettings() { result in
            ProgressHUD.dismiss()
            switch result {
            case .success(let response):
                // Update defaults and proceed with the flow
                self.updateDefaultsAndProceed(with: response)
            case .failure(let error):
                self.presentAlert(for: error)
            }
        }
    }

    private func updateDefaultsAndProceed(with response: GlobalSettingsResponse) {
        Defaults.skipPhoneVerification = response.skipPhoneVerification
        Defaults.isDynamicRideSearch = response.isDynamicRideSearch
        Defaults.flux = response.flux
        Defaults.hideTripAlternativeSurvey = response.hideTripAlternativeSurvey

        if response.skipPhoneVerification {
            self.proceedToMainScreen()
        } else {
            self.requestPhonePincode(
                phone: self.phoneField.trimmedText,
                countryCode: getCountryCode(self.countryCodeField.trimmedText)
            )
        }
    }

    private func proceedToMainScreen() {
        let user = self.context.currentUser
        MixpanelManager.checkPermissionAndIdentifyUser(user)
        BugsnagManager.checkPermissionAndIdentifyUser(user)
        GAManager.checkPermissionAndIdentifyUser(user)
        IntercomManager.checkPermissionAndIdentifyUser(user)
        let vc = RiderTabBarController()
        UIApplication.shared.activeWindow?.rootViewController = vc
    }

    func requestPhonePincode(phone: String, countryCode: String) {
        ProgressHUD.show()

        let request = PhonePincodeRequest(phone: phone, countryCode: countryCode)
        context.api.phonePincode(request) { _ in
            ProgressHUD.dismiss()

            let vc = PincodeViewController()
            vc.type = .phoneVerification
            vc.pincodeTarget = phone
            vc.countryCode = countryCode
            self.navigationController?.pushViewController(vc, animated: true)
        }
    }

    @objc private func dobPickerValueChanged(_ dobPicker: UIDatePicker) {
        dobField.text = BirthdayValidator.displayDateFormatter.string(from: dobPicker.date)
        dobField.toggleErrorState(invalidValidator: nil)
    }

    func transition(to style: TitlePageViewStyle) {
        let vc = RegisterViewController()
        vc.style = style
        navigationController?.pushViewController(vc, animated: true)
    }

}

extension RegisterViewController: UIPickerViewDelegate, UIPickerViewDataSource {

    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }

    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return pickerView.tag == 1 ? genderOptions.count : countryCodes.count
    }

    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        if(pickerView.tag == 1) {
            return genderOptions[row].localize()
        }
    
        let country = countryCodes[row];
        return String(country.count == 0 ? "" : country.prefix(country.count - 2))
    }

    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        if(pickerView.tag == 1) {
            guard row < genderOptions.count else {
                return
            }
            genderField.text = genderOptions[row].localize()
            genderField.toggleErrorState(invalidValidator: nil)
        } else {
            guard row < countryCodes.count else {
                return
            }
            
            let country = countryCodes[row];
            countryCodeField.text = String(country.count == 0 ? "" : country.prefix(country.count - 2))
            countryCodeField.toggleErrorState(invalidValidator: nil)
        }
        
    }
}

extension RegisterRequest {

    init(form: RegisterViewController.RegisterForm) {
        self.init(
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            password: form.password,
            zip: form.zipCode,
            gender: TranslationsManager.getGenderOption(
                form.gender,
                translationMode: .toEn
            ),
            dob: form.dob,
            phone: form.phone,
            countryCode: form.countryCode,
            google: form.google,
            apple: form.apple
        )
    }

}

extension RegisterViewController: LegalDisclaimerViewDelegate {
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
