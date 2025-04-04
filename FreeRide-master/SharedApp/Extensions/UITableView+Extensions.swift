//
//  UITableView+Extensions.swift
//  Circuit
//
//  Created by Andrew Boryk on 12/21/18.
//  Copyright © 2018 Rocket & Mouse Inc. All rights reserved.
//

import UIKit

extension UITableView {

    /// Registers a `UITableViewCell` class with the `UITableView`.
    /// The cell's identifier must match the class name.
    ///
    /// - Parameter cellType: The type of cell to register
    public func register<T: UITableViewCell>(_ cellType: T.Type) {
        let identifier = String(describing: cellType)
        register(cellType, forCellReuseIdentifier: identifier)
    }

    /// Registers a `UITableViewCell`'s nib with the `UITableView`
    /// The nib's file name must match the class name and it must contain the cell at the root of the hierarchy
    ///
    /// - Parameter cellType: The type of cell to register
    public func registerNib<T: UITableViewCell>(_ cellType: T.Type) {
        let identifier = String(describing: cellType)
        let nib = UINib(nibName: identifier, bundle: Bundle(for: cellType))
        register(nib, forCellReuseIdentifier: identifier)
    }

    /// Registers a `UITableViewHeaderFooterView` with the `UITableView`
    ///
    /// - Parameter headerFooterViewType: The type of header footer view to register
    public func register<T: UITableViewHeaderFooterView>(_ headerFooterViewType: T.Type) {
        let identifier = String(describing: headerFooterViewType)
        register(headerFooterViewType, forHeaderFooterViewReuseIdentifier: identifier)
    }

    /// Registers a `UITableViewHeaderFooterView`'s nib with the `UITableView`
    /// The nib's file name must match the class name and it must contain the view at the root of the hierarchy
    ///
    /// - Parameter headerFooterViewType: The type of cell to register
    public func registerNib<T: UITableViewHeaderFooterView>(_ headerFooterViewType: T.Type) {
        let identifier = String(describing: headerFooterViewType)
        let nib = UINib(nibName: identifier, bundle: Bundle(for: headerFooterViewType))
        register(nib, forHeaderFooterViewReuseIdentifier: identifier)
    }

    /// Dequeues a `UITableViewCell`
    ///
    /// - Parameters:
    ///   - cellType: The type of cell to dequeue
    ///   - indexPath: The indexPath to dequeue the cell
    /// - Returns: An existing or newly created cell
    public func dequeueCell<T: UITableViewCell>(_ cellType: T.Type, for indexPath: IndexPath) -> T {
        let identifier = String(describing: cellType)
        return dequeueReusableCell(withIdentifier: identifier, for: indexPath) as! T
    }

    /// Dequeues a `UITableViewHeaderFooterView`
    ///
    /// - Parameter headerFooterViewType: The type of view to dequeue
    /// - Returns: An existing or newly created view
    public func dequeueHeaderFooterView<T: UITableViewHeaderFooterView>(_ headerFooterViewType: T.Type) -> T {
        let identifier = String(describing: headerFooterViewType)
        return dequeueReusableHeaderFooterView(withIdentifier: identifier) as! T
    }
}
