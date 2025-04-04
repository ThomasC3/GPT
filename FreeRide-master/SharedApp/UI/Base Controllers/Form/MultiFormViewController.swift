//
//  MultiFormViewController.swift
//  FreeRide
//

import Foundation
import UIKit

class MultiFormViewController: FormViewController {
        
    var textViews = [TextView]()
    var checkBoxes = [CheckBox]()
    
    override func setupStackView() {
        middleStackView.addArrangedSubview(scrollView)
        scrollView.pinHorizontalEdges(to: middleStackView)
        
        scrollView.addSubview(formStackView)

        addViewsBeforeFields()

        formStackView.addArrangedSubview(fieldsParentStackView)

        fields.forEach {
            $0.configureMember(of: fields, delegate: self)
            fieldsStackView.addArrangedSubview($0)
            $0.translatesAutoresizingMaskIntoConstraints = false
            $0.pinHorizontalEdges(to: fieldsStackView, constant: 30)
        }
        
        textViews.forEach {
            $0.additionalDelegate = self
            fieldsStackView.addArrangedSubview($0)
            $0.translatesAutoresizingMaskIntoConstraints = false
            $0.pinHorizontalEdges(to: fieldsStackView, constant: 30)
        }
        
        checkBoxes.forEach {
            fieldsStackView.addArrangedSubview($0)
            $0.translatesAutoresizingMaskIntoConstraints = false
            $0.pinHorizontalEdges(to: fieldsStackView, constant: 30)
        }
        
        addViewsAfterFields()

        actionViews.forEach {
            fieldsStackView.addArrangedSubview($0)
            $0.translatesAutoresizingMaskIntoConstraints = false
            $0.pinHorizontalEdges(to: fieldsStackView, constant: 30)
        }

        addViewsAfterActions()
    }
    
    @objc override func resignAllResponders() {
        fields.forEach { $0.resignFirstResponder() }
        textViews.forEach { $0.dismissFocus() }
    }
    
    override func isValid() -> Bool {
        return fields.filter({ !$0.validate() }).isEmpty && textViews.filter({ !$0.validate() }).isEmpty
    }
    
    override func localizedErrorDescription() -> String? {
        for field in fields {
            for validator in field.validators.sorted(by: { $0.priority < $1.priority }) {
                if !validator.isValid(field.text) {
                    return validator.localizedDescription(field.text, title: field.name)
                }
            }
        }
                
        for view in textViews {
            for validator in view.validators.sorted(by: { $0.priority < $1.priority }) {
                if !validator.isValid(view.text) {
                    return validator.localizedDescription(view.text, title: view.placeholder)
                }
            }
        }

        return nil
    }
    
    override func scrollViewAdaptToStartEditing() {
        
        if let field = fields.filter({ $0.isFirstResponder }).first {
            scrollViewAdaptToStartEditing(field)
            return
        }
                
        if let view = textViews.filter({ $0.isFirstResponder }).first {
            scrollViewAdaptToStartEditing(view)
            return
        }
    }
    
    override func scrollViewDidFinishEditing() {
        
        if !fields.filter({ $0.isFirstResponder }).isEmpty {
            return
        }
        
        if !textViews.filter({ $0.isFirstResponder }).isEmpty {
            return
        }

        scrollView.setContentOffset(.zero, animated: true)
    }
}

extension MultiFormViewController: TextViewDelegate {
    
    func didBeginEditing(textView: TextView) {
        scrollViewAdaptToStartEditing()
    }

    func didEndEditing(textView: TextView) {
        scrollViewDidFinishEditing()
    }
}

