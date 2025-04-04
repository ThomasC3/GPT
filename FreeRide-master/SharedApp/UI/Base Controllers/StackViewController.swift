//
//  StackViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

class StackViewController: ViewController {

    open override var title: String? {
        didSet {
            topView.title = title
        }
    }

    var confirmationButtonTitle: String? {
        didSet {
            bottomView.confirmationTitle = confirmationButtonTitle
        }
    }

    var confirmationButtonStyle: Button.Style = .primary {
        didSet {
            bottomView.confirmationStyle = confirmationButtonStyle
        }
    }

    var alternateButtonTitle: String? {
        get { return bottomView.alternateTitle }
        set { bottomView.alternateTitle = newValue }
    }

    let topView: TopView = .instantiateFromNib()
    let bottomView: BottomView = .instantiateFromNib()
    let middleStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.distribution = .fill

        return stack
    }()

    lazy var stackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [topView, middleStackView, bottomView])
        stack.axis = .vertical
        stack.alignment = .fill
        stack.distribution = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false

        return stack
    }()

    var leftNavigationStyle: Button.TopNavigationStyle {
        get { return topView.leftNavigationStyle }
        set { topView.leftNavigationStyle = newValue }
    }

    var rightNavigationStyle: Button.TopNavigationStyle {
        get { return topView.rightNavigationStyle }
        set { topView.rightNavigationStyle = newValue }
    }

    var leftNavigationAction: Button.TopNavigationAction {
        get { return topView.leftNavigationAction }
        set { topView.leftNavigationAction = newValue }
    }

    var rightNavigationAction: Button.TopNavigationAction {
        get { return topView.rightNavigationAction }
        set { topView.rightNavigationAction = newValue }
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.addSubview(stackView)
        stackView.pinHorizontalEdges(to: view)

        stackView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor).isActive = true
        stackView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor).isActive = true

        topView.delegate = self
        bottomView.delegate = self

        view.backgroundColor = Theme.Colors.white
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        if let verticalStackView = topView.verticalStackView {
            topView.bringSubviewToFront(verticalStackView)
        }

        bottomView.alternateButton?.isHidden = alternateButtonTitle?.isEmpty ?? true
        bottomView.confirmationButton?.isHidden = confirmationButtonTitle?.isEmpty ?? true
        bottomView.isHidden = bottomView.stackView.arrangedSubviews.filter({ !$0.isHidden }).isEmpty
    }

    func handleAlternateAction() {
        // Needs to be overridden
    }

    func handleConfirmationAction() {
        // Needs to be overridden
    }

    func disableAlternateButton(for seconds: TimeInterval) {
        bottomView.disableAlternateButton(for: seconds)
    }
    
    #if DRIVER
    func fetchDriverActions() {
        // Needs to be overridden
    }
    #endif
    
}

extension StackViewController: TopViewDelegate {
    func didPressTopLeftButton(in view: TopView, style: Button.TopNavigationStyle, action: Button.TopNavigationAction) {
        handleAction(action)
    }

    func didPressTopRightButton(in view: TopView, style: Button.TopNavigationStyle, action: Button.TopNavigationAction) {
        handleAction(action)
    }

    private func handleAction(_ action: Button.TopNavigationAction) {
        switch action {
        case .dismiss(let animated):
            dismiss(animated: animated)
        case .pop(let animated):
            navigationController?.popViewController(animated: animated)
        case .toggleMenu:
            tabController?.toggleMenu()
        case .custom(let completion):
            completion()
        case .none:
            break
        }
    }
}

extension StackViewController: BottomViewDelegate {

    func didPressAlternateButton(in bottomView: BottomView) {
        handleAlternateAction()
    }

    func didPressConfirmationButton(in bottomView: BottomView) {
        handleConfirmationAction()
    }
}
