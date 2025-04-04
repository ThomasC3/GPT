//
//  KeyboardAccessoryView.swift
//  Circuit
//
//  Created by Andrew Boryk on 11/2/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

protocol FieldAccessoryViewDelegate: AnyObject {
    func shouldTransition(forward: Bool, fromIndex index: Int)
}

class FieldAccessoryView: UIView {

    weak var delegate: FieldAccessoryViewDelegate?

    let beforeButton: Button = {
        let button = Button(image: #imageLiteral(resourceName: "PreviousButton"))
        return button
    }()

    let afterButton: Button = {
        let button = Button(image: #imageLiteral(resourceName: "NextButton"))
        return button
    }()

    let doneButton: Button = {
        let button = Button()
        button.constrainHeight(32)
        button.setTitle("Done", for: .normal)
        button.style = .tertiaryDark
        return button
    }()

    lazy var stackView: UIStackView = {
        let directionStackView = UIStackView(arrangedSubviews: [beforeButton, afterButton])
        directionStackView.spacing = 6

        let view = UIStackView(arrangedSubviews: [directionStackView, doneButton])
        view.distribution = .equalSpacing

        return view
    }()

    let textField: TextField
    private let index: Int
    private let total: Int

    init(textField: TextField, in fields: [TextField], delegate: FieldAccessoryViewDelegate?) {
        self.textField = textField
        self.delegate = delegate
        index = fields.firstIndex(of: textField) ?? 0
        total = fields.count

        super.init(frame: CGRect(x: 0, y: 0, width: 320, height: 40))

        backgroundColor = Theme.Colors.lightGray
        addSubview(stackView)

        beforeButton.isEnabled = (index - 1) >= 0
        afterButton.isEnabled = (index + 1) < total

        beforeButton.addTarget(self, action: #selector(beforeAction), for: .touchUpInside)
        afterButton.addTarget(self, action: #selector(afterAction), for: .touchUpInside)
        doneButton.addTarget(self, action: #selector(doneAction), for: .touchUpInside)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        stackView.frame = CGRect(x: 8, y: 4, width: frame.width - 24, height: 32)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc private func beforeAction() {
        delegate?.shouldTransition(forward: false, fromIndex: index)
    }

    @objc private func afterAction() {
        delegate?.shouldTransition(forward: true, fromIndex: index)
    }

    @objc private func doneAction() {
        textField.resignFirstResponder()
    }
}

class TextViewAccessoryView: UIView {

    let doneButton: Button = {
        let button = Button()
        button.constrainHeight(32)
        button.setTitle("Done", for: .normal)
        button.style = .tertiaryDark
        return button
    }()

    lazy var stackView: UIStackView = {
        let directionStackView = UIStackView(arrangedSubviews: [])
        directionStackView.spacing = 6

        let view = UIStackView(arrangedSubviews: [directionStackView, doneButton])
        view.distribution = .equalSpacing

        return view
    }()

    let textView: TextView

    init(textView: TextView) {
        self.textView = textView

        super.init(frame: CGRect(x: 0, y: 0, width: 320, height: 40))

        backgroundColor = Theme.Colors.lightGray
        addSubview(stackView)

        doneButton.addTarget(self, action: #selector(doneAction), for: .touchUpInside)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        stackView.frame = CGRect(x: 8, y: 4, width: frame.width - 24, height: 32)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc private func doneAction() {
        textView.dismissFocus()
    }
}

private extension Button {

    convenience init(image: UIImage?) {
        self.init()

        setImage(image, for: .normal)
        constrainSize(CGSize(width: 32, height: 32))
    }
}
