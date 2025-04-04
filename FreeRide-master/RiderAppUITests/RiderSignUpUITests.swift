//
//  RiderSignUpUITests.swift
//  RiderAppUITests
//
//  Created by Ricardo Pereira on 10/08/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import XCTest

class RiderSignUpUITests: XCTestCase {

    var app: XCUIApplication!

    static var mockPhoneVerification: Bool = false

    static var newlyCreatedAccountEmail: String = ""
    static var newlyCreatedAccountPassword: String = ""

    let dateFormatter: DateFormatter = {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.dateFormat = "yyyy.MM.dd.HH.mm.ss"
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        return dateFormatter
    }()

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("-disableAnimations")
        if Self.mockPhoneVerification {
            app.launchArguments.append("-mockPhoneVerification")
        }
        app.launch()
    }

    override func tearDown() {
    }

    func test01_SignUp_WithIgnoredPhoneVerification_ShouldSucceed() {
        let walkthroughSignInButton = app.buttons["signUpButton"]
        walkthroughSignInButton.tap()

        let firstNameTextField = app.textFields["firstNameTextField"]
        firstNameTextField.waitForExistence()
        firstNameTextField.tap()
        firstNameTextField.typeText("   ")
        firstNameTextField.keyboardReturn()

        let nextButton = app.buttons["confirmationButton"]
        nextButton.waitForExistence()
        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["First Name is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        firstNameTextField.tap()
        firstNameTextField.clearText()
        firstNameTextField.typeText("iOS Tester")
        firstNameTextField.keyboardReturn()

        let lastNameTextField = app.textFields["lastNameTextField"]
        lastNameTextField.typeText("   ")
        lastNameTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Last Name is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        lastNameTextField.tap()
        lastNameTextField.clearText()
        lastNameTextField.typeText("Test Suite")
        lastNameTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Email is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let emailTextField = app.textFields["emailTextField"]
        emailTextField.tap()
        emailTextField.typeText("a@b")
        emailTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Email address is not valid"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let newAccountEmail = "ios.tester." + dateFormatter.string(from: Date()) + "@ridecircuit.com"
        emailTextField.tap()
        emailTextField.clearText()
        emailTextField.typeText(newAccountEmail)
        emailTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Password is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let passwordTextField = app.secureTextFields["passwordTextField"]
        passwordTextField.tap()
        passwordTextField.typeText("1")
        passwordTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Password must be at least 8 characters"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let newAccountPassword = "12345678"
        passwordTextField.tap()
        passwordTextField.typeText(newAccountPassword)
        passwordTextField.keyboardReturn()

        nextButton.tap()

        let zipCodeTextField = app.textFields["zipCodeTextField"]
        zipCodeTextField.waitForExistence()
        zipCodeTextField.tap()
        zipCodeTextField.typeText("   ")
        zipCodeTextField.keyboardReturn()
        app.buttons["Done"].tap()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Home Zip Code is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        zipCodeTextField.tap()
        zipCodeTextField.clearText()
        zipCodeTextField.typeText("11111")
        zipCodeTextField.keyboardReturn()
        app.buttons["Done"].tap()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Gender is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let genderTextField = app.textFields["genderTextField"]
        genderTextField.tap()
        genderTextField.typeText("Male")
        genderTextField.keyboardReturn()
        app.buttons["Done"].tap()
        
        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Date of Birth is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let dateOfBirthTextField = app.textFields["dateOfBirthTextField"]
        dateOfBirthTextField.tap()
        dateOfBirthTextField.typeText("08/14/2022")
        dateOfBirthTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["You must be at least 16 years of age"].exists)
        app.alerts.element.buttons["Ok"].tap()

        dateOfBirthTextField.tap()
        dateOfBirthTextField.clearText()
        dateOfBirthTextField.typeText("08/14/1987")
        dateOfBirthTextField.keyboardReturn()

        nextButton.tap()

        let countryCodeTextField = app.textFields["countryCodeTextField"]
        countryCodeTextField.waitForExistence()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Country Code is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        countryCodeTextField.tap()
        countryCodeTextField.typeText("Portugal +351")
        countryCodeTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Mobile phone number is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let phoneNumberTextField = app.textFields["phoneNumberTextField"]
        phoneNumberTextField.tap()
        phoneNumberTextField.typeText("9")
        phoneNumberTextField.keyboardReturn()

        nextButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Mobile phone number is not valid"].exists)
        app.alerts.element.buttons["Ok"].tap()

        phoneNumberTextField.tap()
        phoneNumberTextField.clearText()
        phoneNumberTextField.typeText("919999999")
        phoneNumberTextField.keyboardReturn()

        nextButton.tap()

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)

        let pincodeTextField = app.textFields["pincodeTextField"]
        pincodeTextField.waitForExistence()

        let validatePincodeButton = app.buttons["confirmationButton"]
        validatePincodeButton.waitForExistence()
        validatePincodeButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Pincode is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        pincodeTextField.tap()
        pincodeTextField.typeText("999999")
        pincodeTextField.keyboardReturn()

        validatePincodeButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["The pincode you entered is invalid."].exists)
        app.alerts.element.buttons["Ok"].tap()

        // Prepare state for the next test case
        Self.newlyCreatedAccountEmail = newAccountEmail
        Self.newlyCreatedAccountPassword = newAccountPassword

        Self.mockPhoneVerification = true
    }

    func test02_SignUp_WithValidatedPhone_ShouldSucceed() {
        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        let alert = app.alerts.element
        XCTAssert(alert.staticTexts["We'll just need to confirm your phone number"].exists)
        alert.buttons["Ok"].tap()

        let verifyPhoneButton = app.buttons["confirmationButton"]
        verifyPhoneButton.waitForExistence()

        let countryCodeTextField = app.textFields["countryCodeTextField"]
        countryCodeTextField.tap()
        countryCodeTextField.typeText("Portugal +351")

        let phoneNumberTextField = app.textFields["phoneNumberTextField"]
        phoneNumberTextField.tap()
        phoneNumberTextField.typeText("919999999")
        phoneNumberTextField.keyboardReturn()

        verifyPhoneButton.tap()

        let pincodeTextField = app.textFields["pincodeTextField"]
        pincodeTextField.waitForExistence()
        pincodeTextField.tap()
        pincodeTextField.typeText("999999")
        pincodeTextField.keyboardReturn()

        let validatePincodeButton = app.buttons["confirmationButton"]
        validatePincodeButton.tap()

        // Wait for dialog messages
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        if app.alerts.element.exists {
            XCTAssert(app.alerts.element.staticTexts["Failed to retrieve lat and lng from users zip"].exists)
            app.alerts.element.buttons["Ok"].tap()
        }

        // Logout
        let menuButton = app.buttons["menuNavigationButton"]
        menuButton.waitForExistence()
        menuButton.tap()

        let tablesQuery = app.tables

        let logoutMenuItem = tablesQuery.staticTexts["Log Out"]
        logoutMenuItem.waitForExistence()
        logoutMenuItem.tap()

        let logOutAlert = app.alerts["Ready to Log Out?"]
        logOutAlert.waitForExistence()
        logOutAlert.scrollViews.otherElements.buttons["Yes"].tap()

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)
    }

    func test03_SignUp_WithValidCredentials_ShouldSignIn() {
        let walkthroughSignInButton = app.buttons["signInButton"]
        walkthroughSignInButton.tap()

        let emailTextField = app.textFields["emailTextField"]
        emailTextField.waitForExistence()
        emailTextField.tap()
        emailTextField.typeText(Self.newlyCreatedAccountEmail)

        let passwordTextField = app.secureTextFields["passwordTextField"]
        passwordTextField.tap()
        passwordTextField.typeText(Self.newlyCreatedAccountPassword)
        // Hide keyboard
        passwordTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["We'll just need to confirm your phone number"].exists)

        // Prepare state for the next test case
        Self.mockPhoneVerification = false
    }

    func test04_SignUp_WithMissingPhoneValidation_ShouldFailSignIn() {
        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        let alert = app.alerts.element
        XCTAssert(alert.staticTexts["We'll just need to confirm your phone number"].exists)
        alert.buttons["Ok"].tap()

        let verifyPhoneButton = app.buttons["confirmationButton"]
        verifyPhoneButton.waitForExistence()
        verifyPhoneButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Country Code is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let countryCodeTextField = app.textFields["countryCodeTextField"]
        countryCodeTextField.waitForExistence()
        countryCodeTextField.tap()
        countryCodeTextField.typeText("Portugal +351")
        countryCodeTextField.keyboardReturn()

        verifyPhoneButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Mobile phone number is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        let phoneNumberTextField = app.textFields["phoneNumberTextField"]
        phoneNumberTextField.waitForExistence()
        phoneNumberTextField.tap()
        phoneNumberTextField.typeText("9")
        phoneNumberTextField.keyboardReturn()

        verifyPhoneButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Mobile phone number is not valid"].exists)
        app.alerts.element.buttons["Ok"].tap()

        phoneNumberTextField.tap()
        phoneNumberTextField.clearText()
        phoneNumberTextField.typeText("919999999")
        phoneNumberTextField.keyboardReturn()

        verifyPhoneButton.tap()

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)

        let pincodeTextField = app.textFields["pincodeTextField"]
        pincodeTextField.waitForExistence()

        let validatePincodeButton = app.buttons["confirmationButton"]
        validatePincodeButton.waitForExistence()
        validatePincodeButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Pincode is required"].exists)
        app.alerts.element.buttons["Ok"].tap()

        pincodeTextField.tap()
        pincodeTextField.typeText("999999")
        pincodeTextField.keyboardReturn()

        validatePincodeButton.tap()

        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["The pincode you entered is invalid."].exists)
        app.alerts.element.buttons["Ok"].tap()

        // Prepare state for the next test case
        Self.mockPhoneVerification = true
    }

    func test05_SignUp_WithPhoneValidation_ShouldContinue() {
        defer {
            Self.mockPhoneVerification = false
        }

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        let alertConfirmYourPhoneNumber = app.alerts.element
        XCTAssert(alertConfirmYourPhoneNumber.staticTexts["We'll just need to confirm your phone number"].exists)
        alertConfirmYourPhoneNumber.buttons["Ok"].tap()

        let verifyPhoneButton = app.buttons["confirmationButton"]
        verifyPhoneButton.waitForExistence()

        let countryCodeTextField = app.textFields["countryCodeTextField"]
        countryCodeTextField.tap()
        countryCodeTextField.typeText("Portugal +351")

        let phoneNumberTextField = app.textFields["phoneNumberTextField"]
        phoneNumberTextField.tap()
        phoneNumberTextField.typeText("919999999")
        phoneNumberTextField.keyboardReturn()

        verifyPhoneButton.tap()

        let pincodeTextField = app.textFields["pincodeTextField"]
        pincodeTextField.waitForExistence()
        pincodeTextField.tap()
        pincodeTextField.typeText("999999")
        pincodeTextField.keyboardReturn()

        let validatePincodeButton = app.buttons["confirmationButton"]
        validatePincodeButton.tap()

        // Wait for dialog messages
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        if app.alerts.element.exists {
            XCTAssert(app.alerts.element.staticTexts["Failed to retrieve lat and lng from users zip"].exists)
            app.alerts.element.buttons["Ok"].tap()
        }

        // Logout
        let menuButton = app.buttons["menuNavigationButton"]
        menuButton.waitForExistence()
        menuButton.tap()

        let tablesQuery = app.tables

        let logoutMenuItem = tablesQuery.staticTexts["Log Out"]
        logoutMenuItem.waitForExistence()
        logoutMenuItem.tap()

        let logOutAlert = app.alerts["Ready to Log Out?"]
        logOutAlert.waitForExistence()
        logOutAlert.scrollViews.otherElements.buttons["Yes"].tap()

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)
    }

}
