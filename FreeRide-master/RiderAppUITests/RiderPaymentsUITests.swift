//
//  RiderPaymentsUITests.swift
//  RiderAppUITests
//
//  Created by Ricardo Pereira on 15/09/2022.
//  Copyright © 2022 Circuit. All rights reserved.
//

import XCTest

class RiderPaymentsUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments.append("-disableAnimations")
        app.launch()
    }

    override func tearDown() {
    }

    func test01_Payments_should_be_able_to_add_card() {
        let app = XCUIApplication()

        if app.buttons["signUpButton"].exists {
            RiderSignInUITests.loginWithRiderTester(app: app)
        }

        // Should not show dialogs with errors
        _ = app.alerts.element.waitForExistence(timeout: TimeInterval(3))
        XCTAssertFalse(app.alerts.element.exists)

        let menuButton = app.buttons["menuNavigationButton"]
        menuButton.waitForExistence()
        menuButton.tap()

        let tablesQuery = app.tables

        let menuItem = tablesQuery.staticTexts["Payments"]
        menuItem.waitForExistence()
        menuItem.tap()

        let addCardButton = app.staticTexts["Add Card"]
        addCardButton.waitForExistence()
        addCardButton.tap()

        let paymentElements = app.scrollViews.otherElements
        
        let cardNumberTextField = paymentElements.textFields["4242424242424242"]
        cardNumberTextField.waitForExistence()
        cardNumberTextField.tap()
        cardNumberTextField.typeText("4242424242424242")

        let expDateTextField = paymentElements.textFields["MM/YY"]
        expDateTextField.tap()
        expDateTextField.typeText("0130")

        let cvcTextField = paymentElements.textFields["CVC"]
        cvcTextField.tap()
        cvcTextField.typeText("123")
        cvcTextField.keyboardReturn()

        let saveCardButton = app.staticTexts["Save Card"]
        saveCardButton.tap()

        let removeCardButton = app.staticTexts["Remove"]
        removeCardButton.waitForExistence()
        removeCardButton.tap()

        app.alerts["Are you sure?"].scrollViews.otherElements.buttons["Yes, remove my payment method"].tap()
    }

}
