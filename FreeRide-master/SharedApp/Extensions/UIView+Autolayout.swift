//
//  UIView+Autolayout.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/5/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension UIView {

    /// A UIView with a frame of .zero and translatesAutoresizingMaskIntoConstraints set to false so it can be positioned using autoLayout.
    public static func autoLayoutView() -> Self {
        let view = self.init(frame: .zero)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }

    /// Sets the width constraint of the view to the given value.
    ///
    /// - Parameter width: The value that the width constraint will be set to
    @discardableResult
    public func constrainWidth(_ width: CGFloat) -> NSLayoutConstraint {
        return constrainSize(CGSize(width: width, height: UIView.noIntrinsicMetric)).first!
    }

    /// Sets the height constraint of the view to the given value.
    ///
    /// - Parameter height: The value that the height constraint will be set to
    @discardableResult
    public func constrainHeight(_ height: CGFloat) -> NSLayoutConstraint {
        return constrainSize(CGSize(width: UIView.noIntrinsicMetric, height: height)).first!
    }

    /// Sets the width and height constraints of the view to the given size.
    ///
    /// - Parameters:
    ///   - size: The size which the height and width constraint values will be derived from
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func constrainSize(_ size: CGSize, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        var constraints = [NSLayoutConstraint]()

        if size.width != UIView.noIntrinsicMetric {
            constraints.append(setConstraint(.width, constant: size.width, priority: priority))
        }

        if size.height != UIView.noIntrinsicMetric {
            constraints.append(setConstraint(.height, constant: size.height, priority: priority))
        }

        return constraints
    }

    /// Set the aspectRatio constraint of the view to the given ratio.
    ///
    /// - Parameters:
    ///   - ratio: Value which the aspectRatio should be set to (1 for 1:1, 0.5 for 1:2, 2.0 for 2:1)
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func constrainAspectRatio(to ratio: CGFloat, priority: UILayoutPriority = .required) -> NSLayoutConstraint {
        return setConstraint(.aspectRatio, constant: ratio, priority: priority)
    }

    /// Pins the edges of the view to another view, and can take an inset value to set as padding on all the edge constraints.
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - inset: Value which will be as spacing on all side constraints
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinEdges(to view: UIView, inset: CGFloat = 0, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return pinEdges(to: view, horizontalInset: inset, verticalInset: inset, priority: priority)
    }

    /// Pins the edges of the view to another view, and can take both a horizontal and vertical inset value to set as padding on their respective edge constraints.
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - horizontalInset: Inset to be used as the constant value for the left and right edge constraints
    ///   - verticalInset: Inset to be used as the constant value for the top and bottom edge constraints
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinEdges(to view: UIView, horizontalInset: CGFloat, verticalInset: CGFloat, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        let insets = UIEdgeInsets(top: verticalInset, left: horizontalInset, bottom: verticalInset, right: horizontalInset)
        return pinEdges(to: view, insets: insets, priority: priority)
    }

    /// Pins the edges of the view to another view, and can a UIEdgeInset value to set as padding on their respective edge constraints.
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - insets: Insets to set for the top, bottom, left and right edge constraints
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinEdges(to view: UIView, insets: UIEdgeInsets, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return [setConstraint(.leading, constant: insets.left, priority: priority, toView: view),
                setConstraint(.top, constant: insets.top, priority: priority, toView: view),
                view.setConstraint(.trailing, constant: insets.right, priority: priority, toView: self),
                view.setConstraint(.bottom, constant: insets.bottom, priority: priority, toView: self)]
    }

    /// Pins the top edge of the view to another view, and can set a constant value for that constraint
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - constant: Inset to set for the top constraint
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinTopEdge(to view: UIView, constant: CGFloat = 0, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return [setConstraint(.top, constant: constant, priority: priority, toView: view)]
    }

    /// Pins the bottom edge of the view to another view, and can set a constant value for that constraint
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - constant: Inset to set for the bottom constraint
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinBottomEdge(to view: UIView, constant: CGFloat = 0, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return [view.setConstraint(.bottom, constant: constant, priority: priority, toView: self)]
    }

    /// Pins the leading edge of the view to another view, and can set a constant value for that constraint
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - constant: Inset to set for the leading constraint
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinLeadingEdge(to view: UIView, constant: CGFloat = 0, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return [setConstraint(.leading, constant: constant, priority: priority, toView: view)]
    }

    /// Pins the trailing edge of the view to another view, and can set a constant value for that constraint
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - constant: Inset to set for the trailing constraint
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinTrailingEdge(to view: UIView, constant: CGFloat = 0, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return [view.setConstraint(.top, constant: constant, priority: priority, toView: self)]
    }

    /// Pins the trailing and leading edges of the view to another view, and can set a constant value for both sides
    ///
    /// - Parameters:
    ///   - view: View to pin edges to
    ///   - constant: Insets to set for the leading and trailing constraints
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pinHorizontalEdges(to view: UIView, constant: CGFloat = 0, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return [setConstraint(.leading, constant: constant, priority: priority, toView: view),
                view.setConstraint(.trailing, constant: constant, priority: priority, toView: self)]
    }

    /// Pins one anchor to another anchor
    ///
    /// - Parameters:
    ///   - anchor: Achor which will be pinned
    ///   - toAnchor: Anchor being pinned to
    ///   - constant: Insets to set for the anchor
    ///   - priority: The priority this constraint should be given
    @discardableResult
    public func pin(anchor: NSLayoutYAxisAnchor, to toAnchor: NSLayoutYAxisAnchor, constant: CGFloat = 0, priority: UILayoutPriority = .required) -> [NSLayoutConstraint] {
        return [anchor.constraint(equalTo: toAnchor, constant: 0)].map {
            $0.isActive = true
            return $0
        }
    }

    /// Sets a constraint to the view using the given constraint kind, and can take a constant value for the constraint, as well as another view to constrain to for constraint kinds other than height or width.
    ///
    /// - Parameters:
    ///   - kind: Kind of constraint to be applied to the view
    ///   - constant: The constant value to be used for the constraint
    ///   - priority: The priority this constraint should be given
    ///   - view: View that the constraint will be applied to (Not necessary for height and width)
    @discardableResult
    public func setConstraint(_ kind: NSLayoutConstraint.Kind, constant: CGFloat = 0, priority: UILayoutPriority = .required, toView view: UIView? = nil) -> NSLayoutConstraint {
        let newConstraint = constraint(for: kind, toView: view, constant: constant)
        newConstraint.priority = priority
        newConstraint.isActive = true

        return newConstraint
    }

    /// Calls the addConstraint function for multiple kinds of constraint.
    ///
    /// - Parameters:
    ///   - kinds: Kind of constraint to be applied to the view
    ///   - constant: The constant value to be used for the constraint
    ///   - priority: The priority this constraint should be given
    ///   - view: View that the constraint will be applied to (Not necessary for height and width)
    @discardableResult
    public func setConstraints(_ kinds: [NSLayoutConstraint.Kind], constant: CGFloat = 0, priority: UILayoutPriority = .required, toView view: UIView? = nil) -> [NSLayoutConstraint] {
        return kinds.map { setConstraint($0, constant: constant, priority: priority, toView: view) }
    }

    // swiftlint:disable:next cyclomatic_complexity
    private func constraint(for kind: NSLayoutConstraint.Kind, toView view: UIView? = nil, constant: CGFloat = 0) -> NSLayoutConstraint {
        if view == nil && kind.requiresMultipleViews {
            fatalError("Constraint of kind \(kind) requires a view to constraint to.")
        }

        switch kind {
        case .width:
            return widthAnchor.constraint(equalToConstant: constant)
        case .height:
            return heightAnchor.constraint(equalToConstant: constant)
        case .centerX:
            return centerXAnchor.constraint(equalTo: view!.centerXAnchor, constant: constant)
        case .centerY:
            return centerYAnchor.constraint(equalTo: view!.centerYAnchor, constant: constant)
        case .bottom:
            return bottomAnchor.constraint(equalTo: view!.bottomAnchor, constant: constant)
        case .left:
            return leftAnchor.constraint(equalTo: view!.leftAnchor, constant: constant)
        case .right:
            return rightAnchor.constraint(equalTo: view!.rightAnchor, constant: constant)
        case .top:
            return topAnchor.constraint(equalTo: view!.topAnchor, constant: constant)
        case .leading:
            return leadingAnchor.constraint(equalTo: view!.leadingAnchor, constant: constant)
        case .trailing:
            return trailingAnchor.constraint(equalTo: view!.trailingAnchor, constant: constant)
        case .firstBaseline:
            return firstBaselineAnchor.constraint(equalTo: view!.firstBaselineAnchor, constant: constant)
        case .lastBaseline:
            return lastBaselineAnchor.constraint(equalTo: view!.lastBaselineAnchor, constant: constant)
        case .aspectRatio:
            return widthAnchor.constraint(equalTo: heightAnchor, multiplier: constant)
        }
    }
}

extension NSLayoutConstraint {

    public enum Kind {
        case width
        case height
        case centerX
        case centerY
        case left
        case top
        case right
        case bottom
        case leading
        case trailing
        case firstBaseline
        case lastBaseline
        case aspectRatio

        /// A Boolean value which specifies whether this type of constraint requires multiple views
        var requiresMultipleViews: Bool {
            switch self {
            case .height, .width, .aspectRatio:
                return false
            default:
                return true
            }
        }

        /// The attribute associated with the constraint
        public var attribute: NSLayoutConstraint.Attribute {
            switch self {
            case .width:
                return .width
            case .height:
                return .height
            case .centerX:
                return .centerX
            case .centerY:
                return .centerY
            case .bottom:
                return .bottom
            case .left:
                return .left
            case .right:
                return .right
            case .top:
                return .top
            case .leading:
                return .leading
            case .trailing:
                return .trailing
            case .firstBaseline:
                return .firstBaseline
            case .lastBaseline:
                return .lastBaseline
            case .aspectRatio:
                return .notAnAttribute
            }
        }
    }
}
