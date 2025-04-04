//
//  DriverAppUITests.swift
//  DriverAppUITests
//
//  Created by Andrew Boryk on 12/14/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import XCTest

class DriverAppUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments.append("-disableAnimations")
        app.launch()
    }

    override func tearDown() {
    }

    func test01_SignIn_should_succeed() {
        let app = XCUIApplication()
        let scrollViewsQuery = app.scrollViews
        let elementsQuery = scrollViewsQuery.otherElements

        let emailTextField = elementsQuery.textFields["emailTextField"]
        emailTextField.tap()
        emailTextField.typeText(secretDriverTesterEmail)

        let passwordTextField = elementsQuery.secureTextFields["passwordTextField"]
        passwordTextField.tap()
        passwordTextField.typeText(secretDriverTesterPassword)
        // Hide keyboard
        passwordTextField.keyboardReturn()

        let intoxicationCheckBox = app.otherElements["intoxicationCheckBox"]
        intoxicationCheckBox.tap()

        let licenceCheckBox = app.otherElements["licenceCheckBox"]
        licenceCheckBox.tap()

        let rulesCheckBox = app.otherElements["rulesCheckBox"]
        rulesCheckBox.tap()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Should not show dialogs with errors
        app.alerts.element.waitForExistence()
        XCTAssertFalse(app.alerts.element.exists)
    }

    func test02_SignOut_should_succeed() {
        let app = XCUIApplication()
        let menuButton = app.buttons["menuNavigationButton"]
        menuButton.waitForExistence()
        menuButton.tap()

        let tablesQuery = app.tables

        let settingsMenuItem = tablesQuery.staticTexts["Settings"]
        settingsMenuItem.waitForExistence()
        settingsMenuItem.tap()

        let logoutMenuItem = tablesQuery.staticTexts["Log out"]
        logoutMenuItem.waitForExistence()
        logoutMenuItem.tap()

        let logOutAlert = app.alerts["Ready to Log Out?"]
        logOutAlert.waitForExistence()
        logOutAlert.scrollViews.otherElements.buttons["Yes"].tap()

        // Should not show dialogs with errors
        app.alerts.element.waitForExistence()
        XCTAssertFalse(app.alerts.element.exists)
    }

    func test03_SignIn_should_fail_with_unrecognized_user_account() {
        let app = XCUIApplication()
        let scrollViewsQuery = app.scrollViews
        let elementsQuery = scrollViewsQuery.otherElements

        let emailTextField = elementsQuery.textFields["emailTextField"]
        emailTextField.tap()
        emailTextField.typeText(secretDriverTesterEmail)

        let passwordTextField = elementsQuery.secureTextFields["Password"]
        passwordTextField.tap()
        passwordTextField.typeText("12345678")
        // Hide keyboard
        passwordTextField.keyboardReturn()

        let intoxicationCheckBox = app.otherElements["intoxicationCheckBox"]
        intoxicationCheckBox.tap()

        let licenceCheckBox = app.otherElements["licenceCheckBox"]
        licenceCheckBox.tap()

        let rulesCheckBox = app.otherElements["rulesCheckBox"]
        rulesCheckBox.tap()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["The email or password you entered is incorrect."].exists)
    }

    func test04_SignIn_should_fail_with_email_is_required() {
        let app = XCUIApplication()
        let scrollViewsQuery = app.scrollViews
        let elementsQuery = scrollViewsQuery.otherElements

        let emailTextField = elementsQuery.textFields["emailTextField"]
        emailTextField.tap()
        emailTextField.typeText("     ")

        // Hide keyboard
        emailTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Email is required"].exists)
    }

    func test05_SignIn_should_fail_with_invalid_email() {
        let app = XCUIApplication()
        let scrollViewsQuery = app.scrollViews
        let elementsQuery = scrollViewsQuery.otherElements

        let emailTextField = elementsQuery.textFields["emailTextField"]
        emailTextField.tap()
        emailTextField.typeText("a@b")

        // Hide keyboard
        emailTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Email address is not valid"].exists)
    }

    func test06_SignIn_should_fail_with_password_is_required() {
        let app = XCUIApplication()
        let scrollViewsQuery = app.scrollViews
        let elementsQuery = scrollViewsQuery.otherElements

        let emailTextField = elementsQuery.textFields["emailTextField"]
        emailTextField.tap()
        emailTextField.typeText("a@b.com")
        // Hide keyboard
        emailTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["Password is required"].exists)
    }

    func test06_SignIn_should_fail_with_missing_validation_checks() {
        let app = XCUIApplication()
        let scrollViewsQuery = app.scrollViews
        let elementsQuery = scrollViewsQuery.otherElements

        let emailTextField = elementsQuery.textFields["emailTextField"]
        emailTextField.tap()
        emailTextField.typeText("a@b.com")

        let passwordTextField = elementsQuery.secureTextFields["Password"]
        passwordTextField.tap()
        passwordTextField.typeText("123")
        // Hide keyboard
        passwordTextField.keyboardReturn()

        let signInButton = app.buttons["confirmationButton"]
        signInButton.waitForExistence()
        signInButton.tap()

        // Wait for the dialog message
        app.alerts.element.waitForExistence()
        XCTAssert(app.alerts.element.staticTexts["You need to complete the personal inspection before you login"].exists)
    }

}
