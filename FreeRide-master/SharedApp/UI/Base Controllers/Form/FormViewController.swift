//
//  FormViewController.swift
//  Circuit
//
//  Created by Andrew Boryk on 10/31/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

var keyboardHeight: CGFloat?

class FormViewController: StackViewController {

    var fields = [TextField]() {
        didSet {
            removeAllFields()
            reloadFields()
        }
    }

    var actionViews = [FormActionView]() {
        didSet {
            removeAllFields()
            reloadFields()
        }
    }

    let scrollView = UIScrollView()

    lazy var fieldsParentStackView: UIStackView = {
        let view = UIStackView(arrangedSubviews: [fieldsStackView])
        view.axis = .horizontal
        view.alignment = .top
        view.distribution = .fill
        return view
    }()

    let formStackView: UIStackView = {
        let view = UIStackView()
        view.axis = .vertical
        view.alignment = .fill
        view.distribution = .fill
        view.spacing = 16
        return view
    }()

    let fieldsStackView: UIStackView = {
        let view = UIStackView()
        view.axis = .vertical
        view.spacing = 16
        view.alignment = .center
        view.distribution = .fill
        return view
    }()

    override func viewDidLoad() {
        super.viewDidLoad()

        if #available(iOS 11.0, *) {
            scrollView.contentInsetAdjustmentBehavior = .never
        } 
        else {
            automaticallyAdjustsScrollViewInsets = false
        }

        navigationController?.setNavigationBarHidden(true, animated: false)

        view.backgroundColor = .white
        view.addTapRecognizer(target: self, selector: #selector(resignAllResponders))

        setupStackView()

        Notification.addObserver(self, name: UIResponder.keyboardWillShowNotification, selector: #selector(keyboardWillShow))
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        var size = view.frame.size
        formStackView.frame.origin = .zero

        let intrinsicHeight = formStackView.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize).height
        let scrollViewHeight = scrollView.frame.height
        let needsScrolling = intrinsicHeight > scrollViewHeight
        size.height = needsScrolling ? intrinsicHeight : (scrollViewHeight - 12)

        formStackView.frame.size = size
        scrollView.contentSize = CGSize(width: size.width, height: size.height + (needsScrolling ? 12 : 0))
    }

    func isValid() -> Bool {
        return fields.filter({ !$0.validate() }).isEmpty
    }

    func isValidWithError() -> Bool {
        let valid = isValid()
        
        if !valid, let error = localizedErrorDescription() {
            presentAlert("Invalid Submission".localize(), message: error)
        }

        return valid
    }

    func localizedErrorDescription() -> String? {
        for field in fields {
            for validator in field.validators.sorted(by: { $0.priority < $1.priority }) {
                if !validator.isValid(field.text) {
                    return validator.localizedDescription(field.text, title: field.name)
                }
            }
        }

        return nil
    }

    func setupStackView() {
        middleStackView.addArrangedSubview(scrollView)
        scrollView.pinHorizontalEdges(to: middleStackView)

        scrollView.addSubview(formStackView)

        addViewsBeforeFields()

        formStackView.addArrangedSubview(fieldsParentStackView)

        reloadFields()
    }

    func reloadFields() {
        for fieldView in fields {
            fieldView.configureMember(of: fields, delegate: self)
            fieldsStackView.addArrangedSubview(fieldView)
            fieldView.pinHorizontalEdges(to: fieldsStackView, constant: 30)
        }

        addViewsAfterFields()

        for actionView in actionViews {
            fieldsStackView.addArrangedSubview(actionView)
            actionView.pinHorizontalEdges(to: fieldsStackView, constant: 30)
        }

        addViewsAfterActions()
    }

    func removeAllFields() {
        for arrangedSubview in fieldsStackView.arrangedSubviews {
            arrangedSubview.removeFromSuperview()
        }
    }

    @objc func resignAllResponders() {
        fields.forEach { $0.resignFirstResponder() }
    }

    open func addViewsBeforeFields() {
        // Requires override
    }

    open func addViewsAfterFields() {
        // Requires override
    }
    
    open func addViewsAfterActions() {
        // Requires override
    }
    
    @objc private func keyboardWillShow(notification: Notification) {
        keyboardHeight = (notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue.height
        scrollViewAdaptToStartEditing()
    }
    
    func scrollViewAdaptToStartEditing() {
        
        if let field = fields.filter({ $0.isFirstResponder }).first {
            scrollViewAdaptToStartEditing(field)
            return
        }
    }

    func scrollViewAdaptToStartEditing(_ field: TextField) {
        
        let fieldPosition = field.convert(CGPoint.zero, to: formStackView)
        let fieldPaddedPosition = fieldPosition.y + middleStackView.frame.origin.y + field.frame.height + fieldsStackView.spacing
                
        setScrollViewOffset(responder: field, fieldPosition: fieldPosition, fieldPaddedPosition: fieldPaddedPosition)
    }
    
    func scrollViewAdaptToStartEditing(_ view: TextView) {
        
        let viewPosition = view.convert(CGPoint.zero, to: formStackView)
        let viewPaddedPosition = viewPosition.y + middleStackView.frame.origin.y + view.frame.height + fieldsStackView.spacing
                
        setScrollViewOffset(responder: view, fieldPosition: viewPosition, fieldPaddedPosition: viewPaddedPosition)
    }
    
    func setScrollViewOffset(responder: UIView, fieldPosition: CGPoint, fieldPaddedPosition: CGFloat) {

        guard let keyboardHeight = keyboardHeight else {
            return
        }

        let inputAccessoryHeight = responder.inputAccessoryView?.frame.height ?? 0

        let keyboardOffset = view.frame.height - keyboardHeight - inputAccessoryHeight

        guard fieldPaddedPosition > keyboardOffset else {
            return
        }

        let offset = fieldPaddedPosition - keyboardOffset

        let point = CGPoint(x: 0, y: offset)
        scrollView.setContentOffset(point, animated: true)
    }

    func scrollViewDidFinishEditing() {
        
        if !fields.filter({ $0.isFirstResponder }).isEmpty {
            return
        }
    
        scrollView.setContentOffset(.zero, animated: true)
    }
}

extension FormViewController: TextFieldDelegate {

    func didChangeText(in textField: TextField) {
        // unused
    }

    func didBeginEditing(textField: TextField) {
        scrollViewAdaptToStartEditing()
    }

    func didEndEditing(textField: TextField) {
        scrollViewDidFinishEditing()
    }

    func didClear(textField: TextField) {
        // Unused
    }

    func didReturn(textField: TextField) {
        guard textField != fields.last else {
            textField.resignFirstResponder()
            return
        }

        guard let index = fields.firstIndex(of: textField), index + 1 < fields.count else {
            return
        }

        fields[index + 1].becomeFirstResponder()
    }
}

extension FormViewController: FieldAccessoryViewDelegate {

    func shouldTransition(forward: Bool, fromIndex index: Int) {
        let nextIndex = index + (forward ? 1 : -1)
        guard nextIndex >= 0 && nextIndex < fields.count else {
            return
        }

        fields[nextIndex].becomeFirstResponder()
    }
}
